import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals'
import request from 'supertest'
import { createApp } from '../../src/app'
import { School } from '../../src/models/School'
import { Student } from '../../src/models/Student'
import { Conversation } from '../../src/models/Conversation'
import { hashPassword } from '../../src/utils/password'
import { signToken } from '../../src/utils/jwt'
import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from './dbTestUtils'

const app = createApp()

describe('Free talk turn limit', () => {
  beforeAll(connectTestDatabase)
  afterAll(disconnectTestDatabase)
  beforeEach(clearTestDatabase)

  it('completes after five learner answers and rejects a sixth', async () => {
    const school = await School.create({ name: 'Sample School', code: 'SAMPLE1', contactEmail: 'admin@sample.test', passwordHash: await hashPassword('school-pass'), status: 'active' })
    const student = await Student.create({ schoolId: school._id, fullName: 'Shaikh Saad', rollNumber: '1', passwordHash: await hashPassword('student-pass'), grade: 4, avatarType: 'BOY' })
    const token = signToken({ sub: student._id.toString(), role: 'STUDENT', schoolId: school._id.toString() })
    const start = await request(app).post('/api/ai/conversation/start').set('Authorization', `Bearer ${token}`).send({ mode: 'FREE_TALK' }).expect(201)
    const conversationId = start.body.data.conversationId as string

    for (let turn = 1; turn <= 5; turn += 1) {
      const response = await request(app).post('/api/ai/conversation/turn').set('Authorization', `Bearer ${token}`).send({ conversationId, message: `I like reading books with my family, answer ${turn}.`, inputMode: 'TEXT' }).expect(200)
      expect(response.body.data.conversation.turnCount).toBe(turn)
      expect(response.body.data.conversation.complete).toBe(turn === 5)
      if (turn === 5) expect(response.body.data.followUpQuestion).toBeNull()
    }

    const saved = await Conversation.findById(conversationId)
    expect(saved?.summary).toContain('5 turns')

    await request(app).post('/api/ai/conversation/turn').set('Authorization', `Bearer ${token}`).send({ conversationId, message: 'One extra reply.', inputMode: 'TEXT' }).expect(409)
  })
})
