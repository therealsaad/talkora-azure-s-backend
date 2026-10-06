import request from 'supertest'
import { createApp } from '../../src/app'
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from './dbTestUtils'
import { School } from '../../src/models/School'
import { Student } from '../../src/models/Student'
import { CurriculumClass } from '../../src/models/CurriculumClass'
import { Level } from '../../src/models/Level'
import { Lesson } from '../../src/models/Lesson'
import { Activity } from '../../src/models/Activity'
import { Achievement } from '../../src/models/Achievement'
import { hashPassword } from '../../src/utils/password'
import { signToken } from '../../src/utils/jwt'
import { ProgressService } from '../../src/services/progress.service'

const app = createApp()

beforeAll(async () => connectTestDatabase())
afterAll(async () => disconnectTestDatabase())
afterEach(async () => clearTestDatabase())

describe('achievement unlocking (server-side only)', () => {
  it('tracks a first daily streak and keeps the progress loop authoritative', async () => {
    const school = await School.create({ name: 'School', code: 'ACH001', passwordHash: await hashPassword('pw'), status: 'active' })
    const student = await Student.create({ schoolId: school._id, fullName: 'S', rollNumber: '01', grade: 4, studentCode: 'DDDD', passwordHash: await hashPassword('DDDD'), status: 'active' })
    const klass = await CurriculumClass.create({ grade: 4, name: 'Class 4', order: 1, status: 'active' })
    const level1 = await Level.create({ classId: klass._id, number: 1, order: 1, title: 'Level 1', place: 'Classroom', status: 'active' })
    const lesson1 = await Lesson.create({ levelId: level1._id, order: 1, title: 'Lesson 1', status: 'active' })
    const activity1 = await Activity.create({ lessonId: lesson1._id, type: 'MCQ', title: 'Q', prompt: 'p', order: 1, answer: 'CAT', xp: 10, status: 'active' })

    const progress = await ProgressService.submitAttempt({
      studentId: student._id.toString(),
      activityId: activity1._id.toString(),
      answer: 'CAT',
      startedAt: new Date(),
      hintsUsed: 0,
      idempotencyKey: 'streak-1',
    })

    expect(progress.progress.streak).toBeGreaterThanOrEqual(1)
    expect(progress.progress.lastActivityAt).toBeTruthy()
  })

  it('unlocks "First Quest" after the first correct attempt, and does not double-count on a duplicate submission', async () => {
    const school = await School.create({ name: 'School', code: 'ACH001', passwordHash: await hashPassword('pw'), status: 'active' })
    const student = await Student.create({ schoolId: school._id, fullName: 'S', rollNumber: '01', grade: 4, studentCode: 'DDDD', passwordHash: await hashPassword('DDDD'), status: 'active' })
    const klass = await CurriculumClass.create({ grade: 4, name: 'Class 4', order: 1, status: 'active' })
    const level1 = await Level.create({ classId: klass._id, number: 1, order: 1, title: 'Level 1', place: 'Classroom', status: 'active' })
    const lesson1 = await Lesson.create({ levelId: level1._id, order: 1, title: 'Lesson 1', status: 'active' })
    const activity1 = await Activity.create({ lessonId: lesson1._id, type: 'MCQ', title: 'Q', prompt: 'p', order: 1, answer: 'CAT', xp: 10, status: 'active' })
    await Achievement.create({ key: 'first-quest', title: 'First Quest', description: 'd', category: 'completion', criteria: { type: 'activities_completed', count: 1 } })

    const token = signToken({ sub: student._id.toString(), role: 'STUDENT', schoolId: school._id.toString() })

    const idempotencyKey = 'attempt-1'
    const submit = () =>
      request(app)
        .post(`/api/progress/activities/${activity1._id}/attempts`)
        .set('Authorization', `Bearer ${token}`)
        .send({ answer: 'CAT', startedAt: new Date().toISOString(), hintsUsed: 0, idempotencyKey })

    const first = await submit()
    expect(first.status).toBe(200)
    const firstXp = first.body.data.progress.xp

    const achievements = await request(app).get('/api/achievements/mine').set('Authorization', `Bearer ${token}`)
    const firstQuest = achievements.body.data.find((a: { key: string }) => a.key === 'first-quest')
    expect(firstQuest.unlocked).toBe(true)

    // Idempotency: resubmitting the same key must not double-award XP.
    const second = await submit()
    expect(second.body.data.alreadyProcessed).toBe(true)
    const progressAfter = await request(app).get(`/api/progress/classes/${klass._id}`).set('Authorization', `Bearer ${token}`)
    expect(progressAfter.body.data.xp).toBe(firstXp)
  })
})
