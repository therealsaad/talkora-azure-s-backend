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

async function fixture() {
  const school = await School.create({ name: 'Grade Security School', code: 'GRADE1', passwordHash: await hashPassword('pw'), status: 'active' })
  const student = await Student.create({ schoolId: school._id, fullName: 'Class Four Learner', rollNumber: '01', grade: 4, passwordHash: await hashPassword('ABCD'), avatarType: 'BOY', status: 'active' })
  const class4 = await CurriculumClass.create({ grade: 4, name: 'Class 4', order: 1, status: 'active' })
  const class5 = await CurriculumClass.create({ grade: 5, name: 'Class 5', order: 2, status: 'active' })
  const level4 = await Level.create({ classId: class4._id, number: 1, unitNumber: 1, order: 1, title: 'Class 4 Unit', place: 'World', curriculumVersion: 'class4-term1-v1', availability: 'PUBLISHED', status: 'active' })
  const level5 = await Level.create({ classId: class5._id, number: 1, unitNumber: 1, order: 1, title: 'Class 5 Unit', place: 'World', curriculumVersion: 'class5-v1', availability: 'PUBLISHED', status: 'active' })
  const lesson5 = await Lesson.create({ levelId: level5._id, title: 'Class 5 Lesson', order: 1, status: 'active' })
  const activity5 = await Activity.create({ lessonId: lesson5._id, type: 'CONVERSATION', stage: 'INTERACT', title: 'Class 5 Activity', prompt: 'Speak', order: 1, voiceEnabled: true, aiEnabled: true, status: 'active' })
  const token = signToken({ sub: student._id.toString(), role: 'STUDENT', schoolId: school._id.toString() })
  return { token, class4, class5, level4, activity5 }
}

describe('student curriculum grade security', () => {
  it('returns only the authenticated student grade', async () => {
    const { token } = await fixture()
    const response = await request(app).get('/api/students/me/curriculum').set('Authorization', `Bearer ${token}`)
    expect(response.status).toBe(200)
    expect(response.body.data.studentGrade).toBe(4)
    expect(response.body.data.units.map((unit: { title: string }) => unit.title)).toEqual(['Class 4 Unit'])
  })
  it('blocks Class 5 class and activity URLs for a Class 4 student', async () => {
    const { token, class5, activity5 } = await fixture()
    for (const path of [`/api/classes/${class5._id}`, `/api/activities/${activity5._id}`]) {
      const response = await request(app).get(path).set('Authorization', `Bearer ${token}`)
      expect(response.status).toBe(403)
      expect(response.body.error.code).toBe('CURRICULUM_ACCESS_DENIED')
    }
  })
  it('blocks Class 5 attempts and voice sessions', async () => {
    const { token, activity5 } = await fixture()
    const attempt = await request(app).post(`/api/progress/activities/${activity5._id}/attempts`).set('Authorization', `Bearer ${token}`).send({ answer: 'hello', startedAt: new Date().toISOString(), hintsUsed: 0 })
    const voice = await request(app).post('/api/voice/sessions').set('Authorization', `Bearer ${token}`).send({ activityId: activity5._id.toString() })
    expect(attempt.status).toBe(403); expect(attempt.body.error.code).toBe('CURRICULUM_ACCESS_DENIED')
    expect(voice.status).toBe(403); expect(voice.body.error.code).toBe('CURRICULUM_ACCESS_DENIED')
  })
})
