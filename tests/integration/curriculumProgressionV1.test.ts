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
import { AchievementUnlock } from '../../src/models/AchievementUnlock'
import { hashPassword } from '../../src/utils/password'
import { signToken } from '../../src/utils/jwt'

const app = createApp()
beforeAll(async () => connectTestDatabase())
afterAll(async () => disconnectTestDatabase())
afterEach(async () => clearTestDatabase())

it('completes required content, ignores optional content, unlocks once, and keeps XP/badge idempotent', async () => {
  const school = await School.create({ name: 'Progress School', code: 'PROG01', passwordHash: await hashPassword('pw'), status: 'active' })
  const student = await Student.create({ schoolId: school._id, fullName: 'Learner', rollNumber: '1', grade: 4, passwordHash: await hashPassword('ABCD'), avatarType: 'BOY', status: 'active' })
  const klass = await CurriculumClass.create({ grade: 4, name: 'Class 4', order: 1, status: 'active' })
  const unit1 = await Level.create({ classId: klass._id, number: 1, unitNumber: 1, order: 1, title: 'Unit 1', place: 'World', curriculumVersion: 'class4-term1-v1', availability: 'PUBLISHED', status: 'active' })
  const unit2 = await Level.create({ classId: klass._id, number: 2, unitNumber: 2, order: 2, title: 'Unit 2', place: 'World', curriculumVersion: 'class4-term1-v1', availability: 'PUBLISHED', status: 'active' })
  const lesson = await Lesson.create({ levelId: unit1._id, title: 'Required lesson', order: 1, status: 'active' })
  const required = await Activity.create({ lessonId: lesson._id, type: 'MCQ', stage: 'FINAL_CHALLENGE', title: 'Required', prompt: 'Choose', order: 1, answer: 'YES', xp: 20, required: true, core: true, status: 'active' })
  await Activity.create({ lessonId: lesson._id, type: 'REVIEW', stage: 'BONUS', title: 'Optional', prompt: 'Bonus', order: 2, answer: 'BONUS', required: false, core: false, status: 'active' })
  await Achievement.create({ key: 'unit-one-badge', title: 'Unit One', description: 'Complete one level', category: 'completion', criteria: { type: 'levels_completed', count: 1 } })
  const token = signToken({ sub: student._id.toString(), role: 'STUDENT', schoolId: school._id.toString() })
  const payload = { answer: 'YES', startedAt: new Date(Date.now() - 1000).toISOString(), hintsUsed: 0, idempotencyKey: 'progression-v1' }
  const first = await request(app).post(`/api/progress/activities/${required._id}/attempts`).set('Authorization', `Bearer ${token}`).send(payload)
  const second = await request(app).post(`/api/progress/activities/${required._id}/attempts`).set('Authorization', `Bearer ${token}`).send(payload)
  expect(first.status).toBe(200); expect(first.body.data.progress.levels.find((item: { levelId: string }) => String(item.levelId) === String(unit1._id)).status).toBe('completed')
  expect(first.body.data.progress.levels.find((item: { levelId: string }) => String(item.levelId) === String(unit2._id)).status).toBe('unlocked')
  expect(second.body.data.alreadyProcessed).toBe(true)
  expect(second.body.data.progress.xp).toBe(first.body.data.progress.xp)
  expect(await AchievementUnlock.countDocuments({ studentId: student._id })).toBe(1)
})
