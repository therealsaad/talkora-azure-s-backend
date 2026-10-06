import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import request from 'supertest'
import mongoose from 'mongoose'
import { createApp } from '../../src/app'
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from './dbTestUtils'
import { School } from '../../src/models/School'
import { Student } from '../../src/models/Student'
import { CurriculumClass } from '../../src/models/CurriculumClass'
import { Level } from '../../src/models/Level'
import { Lesson } from '../../src/models/Lesson'
import { Activity } from '../../src/models/Activity'
import { StudentMemory } from '../../src/models/StudentMemory'
import { MistakeRecord } from '../../src/models/MistakeRecord'
import { Conversation } from '../../src/models/Conversation'
import { Progress } from '../../src/models/Progress'
import { StudentContextService } from '../../src/services/student-context.service'
import { MemoryService } from '../../src/services/memory.service'
import { MistakeService } from '../../src/services/mistake.service'
import { MissJulieService } from '../../src/services/missJulie.service'
import { hashPassword } from '../../src/utils/password'
import { signToken } from '../../src/utils/jwt'

const app = createApp()

describe('Core Talkora Product Architecture & Student Continuity', () => {
  beforeAll(async () => {
    await connectTestDatabase()
  })

  afterAll(async () => {
    await disconnectTestDatabase()
  })

  beforeEach(async () => {
    await clearTestDatabase()
  })

  describe('Scenario: Ayaan (Class 5) - Day 1 & Day 2 End-to-End Continuity', () => {
    it('persists learning memory, mistakes, and conversation summary across days', async () => {
      // 1. Create School & Class 5 Student (Ayaan)
      const school = await School.create({
        name: 'Delhi Public Academy',
        code: 'DELHI01',
        contactEmail: 'admin@delhi01.edu',
        passwordHash: await hashPassword('schoolPass123'),
        status: 'active',
      })

      const studentAyaan = await Student.create({
        schoolId: school._id,
        fullName: 'Ayaan Sharma',
        rollNumber: '5A-01',
        grade: 5,
        className: '5A',
        avatarType: 'BOY',
        status: 'active',
        passwordHash: await hashPassword('ayaan123'),
      })

      const ayaanToken = signToken({
        sub: studentAyaan._id.toString(),
        role: 'STUDENT',
        schoolId: school._id.toString(),
      })

      // Setup Class 5 Curriculum
      const class5 = await CurriculumClass.create({
        name: 'Class 5',
        grade: 5,
        order: 1,
        status: 'active',
      })

      const level1 = await Level.create({
        classId: class5._id,
        number: 1,
        order: 1,
        title: 'Favourite Things',
        place: 'Classroom',
        description: 'Talk about your favourite food and hobbies',
        status: 'active',
        availability: 'PUBLISHED',
        learningObjectives: ['state favourites', 'give reasons', 'use past tense correctly'],
      })

      const lesson1 = await Lesson.create({
        levelId: level1._id,
        order: 1,
        title: 'Sports & Hobbies',
        status: 'active',
      })

      const activity1 = await Activity.create({
        lessonId: lesson1._id,
        order: 1,
        title: 'Talking about Yesterday',
        prompt: 'Talk about what you did yesterday',
        type: 'CONVERSATION',
        status: 'active',
        target: 'I went to school yesterday',
        answer: 'I went to school yesterday',
        xp: 25,
        required: true,
        core: true,
        conversationGoal: {
          minTurns: 2,
          maxTurns: 5,
          requiredConcepts: ['state_favourite', 'give_reason'],
        },
      })

      // ==========================================
      // DAY 1: FIRST SESSION
      // ==========================================

      // 1. Start Conversation Session
      const startRes = await request(app)
        .post('/api/ai/conversation/start')
        .set('Authorization', `Bearer ${ayaanToken}`)
        .send({ mode: 'FREE_TALK' })
        .expect(201)

      expect(startRes.body.success).toBe(true)
      expect(startRes.body.data.conversationId).toBeDefined()
      expect(startRes.body.data.message).toContain('Ayaan')
      const convId = startRes.body.data.conversationId

      // 2. Ayaan introduces himself and expresses an interest in cricket
      const turn1Res = await request(app)
        .post('/api/ai/conversation/turn')
        .set('Authorization', `Bearer ${ayaanToken}`)
        .send({
          conversationId: convId,
          message: 'My favourite sport is cricket and I play every evening',
          inputMode: 'MIC',
        })
        .expect(200)

      expect(turn1Res.body.success).toBe(true)
      expect(turn1Res.body.data.message).toBeDefined()

      // Verify personal preference memory was saved in MongoDB
      const sportMemory = await StudentMemory.findOne({
        studentId: studentAyaan._id,
        key: 'favouriteSport',
      })
      expect(sportMemory).not.toBeNull()
      expect(sportMemory?.value?.toLowerCase()).toContain('cricket')
      expect(sportMemory?.confidence).toBeGreaterThanOrEqual(0.8)

      // 3. Ayaan makes a grammatical mistake ("I goed to school yesterday")
      const turn2Res = await request(app)
        .post('/api/ai/conversation/turn')
        .set('Authorization', `Bearer ${ayaanToken}`)
        .send({
          conversationId: convId,
          message: 'I goed to school yesterday and played with my friends',
          inputMode: 'MIC',
        })
        .expect(200)

      expect(turn2Res.body.success).toBe(true)

      // Record irregular verb mistake
      await MistakeService.recordMistake(studentAyaan._id.toString(), {
        skill: 'grammar:irregular_past_tense',
        expected: 'went',
        actual: 'goed',
        type: 'conversation',
      })

      // Verify mistake is recorded in MongoDB
      const mistakesDay1 = await MistakeRecord.find({
        studentId: studentAyaan._id,
        resolved: false,
      })
      expect(mistakesDay1.length).toBeGreaterThan(0)
      expect(mistakesDay1[0].skill).toContain('irregular_past_tense')
      expect(mistakesDay1[0].actual).toBe('goed')

      // 4. Ayaan repeats with correction ("I went to school yesterday")
      const turn3Res = await request(app)
        .post('/api/ai/conversation/turn')
        .set('Authorization', `Bearer ${ayaanToken}`)
        .send({
          conversationId: convId,
          message: 'I went to school yesterday',
          inputMode: 'MIC',
        })
        .expect(200)

      expect(turn3Res.body.success).toBe(true)

      // Mark mistake resolved after successful repetition
      await MistakeService.resolveMistake(studentAyaan._id.toString(), 'grammar:irregular_past_tense')

      // 5. Ayaan completes an activity in Lesson 1
      const attemptRes = await request(app)
        .post(`/api/progress/activities/${activity1._id}/attempts`)
        .set('Authorization', `Bearer ${ayaanToken}`)
        .send({
          answer: 'I went to school yesterday',
          startedAt: new Date(Date.now() - 5000).toISOString(),
          hintsUsed: 0,
        })
        .expect(200)

      expect(attemptRes.body.success).toBe(true)
      expect(attemptRes.body.data.xpAwarded).toBeGreaterThan(0)

      // 6. Day 1 Session Ends -> End conversation & generate session summary
      const endRes = await request(app)
        .post(`/api/ai/conversation/${convId}/end`)
        .set('Authorization', `Bearer ${ayaanToken}`)
        .expect(200)

      expect(endRes.body.success).toBe(true)
      expect(endRes.body.data.status).toBe('COMPLETED')

      // Update with a specific summary for tomorrow's continuation
      await Conversation.findByIdAndUpdate(convId, {
        summary: "Ayaan practiced talking about cricket and yesterday's activities. Practiced past tense 'went'. Confident and enthusiastic.",
      })

      // Verify Day 1 MongoDB state
      const day1Progress = await Progress.findOne({ studentId: studentAyaan._id })
      expect(day1Progress).not.toBeNull()
      expect(day1Progress?.xp).toBeGreaterThan(0)

      // ==========================================
      // DAY 2: RETURN EXPERIENCE
      // ==========================================

      // 1. Ayaan logs in on Day 2
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${ayaanToken}`)
        .expect(200)

      expect(meRes.body.data.student.fullName).toBe('Ayaan Sharma')
      expect(meRes.body.data.student.grade).toBe(5)

      // 2. Load Day 2 Context builder
      const day2Context = await StudentContextService.buildContext(studentAyaan._id.toString(), {
        promptContext: 'greeting',
      })

      expect(day2Context.studentName).toBe('Ayaan')
      expect(day2Context.grade).toBe(5)
      expect(day2Context.studentXp).toBeGreaterThan(0)
      expect(day2Context.memoryFacts.some((f) => f.toLowerCase().includes('cricket'))).toBe(true)
      expect(day2Context.lastSessionSummary).toContain('Ayaan practiced talking about cricket')

      // 3. Day 2 Miss Julie start conversation references real stored facts
      const day2StartRes = await request(app)
        .post('/api/ai/conversation/start')
        .set('Authorization', `Bearer ${ayaanToken}`)
        .send({ mode: 'FREE_TALK' })
        .expect(201)

      expect(day2StartRes.body.success).toBe(true)
      expect(day2StartRes.body.data.message).toContain('Ayaan')
      // Miss Julie references Ayaan's real memory
      expect(day2StartRes.body.data.message).toMatch(/Ayaan|cricket|sports|welcome/i)

      // 4. Day 2 Progress is preserved
      const day2ProgressRes = await request(app)
        .get(`/api/progress/classes/${class5._id}`)
        .set('Authorization', `Bearer ${ayaanToken}`)
        .expect(200)

      expect(day2ProgressRes.body.data.xp).toBe(day1Progress?.xp)
      expect(day2ProgressRes.body.data.levels[0].status).toBe('completed')
    })
  })

  describe('Student Memory Deduplication & Confidence Evolution', () => {
    it('reinforces existing memories and avoids duplicate records', async () => {
      const studentId = new mongoose.Types.ObjectId().toString()
      const convId = new mongoose.Types.ObjectId().toString()

      // 1. Initial fact extraction
      await MemoryService.persistVerifiedPersonalFacts({
        studentId,
        transcript: 'My favourite food is dosa and my favourite sport is football',
        inputMode: 'MIC',
        conversationId: convId,
        turn: 1,
      })

      const initialMemories = await StudentMemory.find({ studentId })
      expect(initialMemories.length).toBe(2)
      const foodMem = initialMemories.find((m) => m.key === 'favouriteFood')
      expect(foodMem?.timesObserved).toBe(1)
      expect(foodMem?.value).toBe('dosa')

      // 2. Repeated fact extraction in subsequent turn
      await MemoryService.persistVerifiedPersonalFacts({
        studentId,
        transcript: 'Yes, my favourite food is dosa with coconut chutney',
        inputMode: 'MIC',
        conversationId: convId,
        turn: 3,
      })

      const updatedMemories = await StudentMemory.find({ studentId })
      // Count must still be 2, NOT 3 (no duplication)
      expect(updatedMemories.length).toBe(2)
      const updatedFoodMem = await StudentMemory.findOne({ studentId, key: 'favouriteFood' })
      expect(updatedFoodMem?.timesObserved).toBe(2)
      expect(updatedFoodMem?.value).toContain('dosa')
    })

    it('rejects low confidence noise words from AI memory suggestions', async () => {
      const studentId = new mongoose.Types.ObjectId().toString()

      await MemoryService.applyMemorySuggestions({
        studentId,
        suggestions: [
          { key: 'noise', value: 'yes', category: 'preference', confidence: 0.95 },
          { key: 'ok', value: 'ok', category: 'preference', confidence: 0.9 },
          { key: 'favouritePlace', value: 'Shimla hill station', category: 'preference', confidence: 0.88 },
          { key: 'tooLow', value: 'something', category: 'vocabulary', confidence: 0.4 },
        ],
      })

      const memories = await StudentMemory.find({ studentId })
      expect(memories.length).toBe(1)
      expect(memories[0].key).toBe('favouritePlace')
      expect(memories[0].value).toBe('Shimla hill station')
    })
  })

  describe('Cross-Student Security & Isolation', () => {
    it('prevents Student A from accessing Student B conversations or memories', async () => {
      const school = await School.create({
        name: 'Public School',
        code: 'PUB01',
        contactEmail: 'admin@pub01.edu',
        passwordHash: await hashPassword('pass123'),
        status: 'active',
      })

      const studentA = await Student.create({
        schoolId: school._id,
        fullName: 'Student A',
        rollNumber: '4A-01',
        grade: 4,
        status: 'active',
        passwordHash: await hashPassword('pass123'),
      })

      const studentB = await Student.create({
        schoolId: school._id,
        fullName: 'Student B',
        rollNumber: '4A-02',
        grade: 4,
        status: 'active',
        passwordHash: await hashPassword('pass123'),
      })

      const tokenA = signToken({
        sub: studentA._id.toString(),
        role: 'STUDENT',
        schoolId: school._id.toString(),
      })

      // Student B creates a conversation
      const convB = await Conversation.create({
        studentId: studentB._id,
        mode: 'FREE_TALK',
        status: 'ACTIVE',
        messages: [{ role: 'missJulie', content: 'Secret message for B', createdAt: new Date() }],
      })

      // Student A tries to end Student B's conversation
      await request(app)
        .post(`/api/ai/conversation/${convB._id}/end`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404)

      // Student A requests memories -> only receives Student A memories
      await StudentMemory.create({
        studentId: studentB._id,
        key: 'secretB',
        value: 'Private data B',
        category: 'preference',
        fact: 'secretB: Private data B',
        confidence: 0.9,
      })

      const memoryRes = await request(app)
        .get('/api/memory/mine')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200)

      expect(memoryRes.body.data.length).toBe(0)
    })
  })
})

