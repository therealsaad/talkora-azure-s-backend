import request from 'supertest'
import { createApp } from '../../src/app'
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from './dbTestUtils'
import { School } from '../../src/models/School'
import { Student } from '../../src/models/Student'
import { CurriculumClass } from '../../src/models/CurriculumClass'
import { Level } from '../../src/models/Level'
import { Lesson } from '../../src/models/Lesson'
import { Activity } from '../../src/models/Activity'
import { hashPassword } from '../../src/utils/password'
import { signToken } from '../../src/utils/jwt'

const app = createApp()

beforeAll(async () => connectTestDatabase())
afterAll(async () => disconnectTestDatabase())
afterEach(async () => clearTestDatabase())

async function seedTwoLevelCurriculum() {
  const school = await School.create({ name: 'School', code: 'LOCK001', passwordHash: await hashPassword('pw'), status: 'active' })
  const student = await Student.create({ schoolId: school._id, fullName: 'S', rollNumber: '01', grade: 4, studentCode: 'CCCC', passwordHash: await hashPassword('CCCC'), status: 'active' })
  const klass = await CurriculumClass.create({ grade: 4, name: 'Class 4', order: 1, status: 'active' })
  const level1 = await Level.create({ classId: klass._id, number: 1, order: 1, title: 'Level 1', place: 'Classroom', status: 'active' })
  const level2 = await Level.create({ classId: klass._id, number: 2, order: 2, title: 'Level 2', place: 'Garden', status: 'active' })
  const lesson2 = await Lesson.create({ levelId: level2._id, order: 1, title: 'Lesson 2', status: 'active' })
  const activity2 = await Activity.create({ lessonId: lesson2._id, type: 'MCQ', title: 'Q', prompt: 'p', order: 1, answer: 'CAT', xp: 10, status: 'active' })
  return { school, student, klass, level1, level2, lesson2, activity2 }
}

describe('level locking business rule', () => {
  it('rejects an attempt submitted against an activity in a locked level', async () => {
    const { school, student, activity2 } = await seedTwoLevelCurriculum()
    const token = signToken({ sub: student._id.toString(), role: 'STUDENT', schoolId: school._id.toString() })

    const res = await request(app)
      .post(`/api/progress/activities/${activity2._id}/attempts`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answer: 'CAT', startedAt: new Date().toISOString(), hintsUsed: 0 })

    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('BUSINESS_RULE_ERROR')
  })
})
