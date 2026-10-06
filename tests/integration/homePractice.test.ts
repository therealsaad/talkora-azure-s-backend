import request from 'supertest'
import mongoose from 'mongoose'
import { createApp } from '../../src/app'
import { School } from '../../src/models/School'
import { Student } from '../../src/models/Student'
import { HomePractice } from '../../src/models/HomePractice'
import { signToken } from '../../src/utils/jwt'
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from './dbTestUtils'

const app = createApp()

beforeAll(connectTestDatabase)
afterAll(disconnectTestDatabase)
afterEach(clearTestDatabase)

it('saves the student recording and lets the student, assigned teacher, and school play it', async () => {
  const school = await School.create({ name: 'Practice School', code: 'HOME01', passwordHash: 'hash', status: 'active' })
  const teacherId = new mongoose.Types.ObjectId()
  const otherTeacherId = new mongoose.Types.ObjectId()
  const student = await Student.create({ schoolId: school._id, teacherId, fullName: 'Saad', rollNumber: '1', passwordHash: 'hash', grade: 4, avatarType: 'BOY' })
  const studentToken = signToken({ sub: student._id.toString(), role: 'STUDENT', schoolId: school._id.toString() })
  const teacherToken = signToken({ sub: teacherId.toString(), role: 'TEACHER', schoolId: school._id.toString() })
  const otherTeacherToken = signToken({ sub: otherTeacherId.toString(), role: 'TEACHER', schoolId: school._id.toString() })
  const schoolToken = signToken({ sub: school._id.toString(), role: 'SCHOOL_ADMIN', schoolId: school._id.toString() })
  const audio = Buffer.from('sample family conversation')

  const saved = await request(app)
    .put('/api/progress/home-practice/favourites')
    .set('Authorization', `Bearer ${studentToken}`)
    .field('reflection', 'I asked a follow-up question and spoke clearly.')
    .field('studentId', new mongoose.Types.ObjectId().toString())
    .attach('audio', audio, { filename: 'practice.webm', contentType: 'audio/webm' })
    .expect(200)
  expect(saved.body.data.reflection).toBe('I asked a follow-up question and spoke clearly.')
  expect(saved.body.data.hasAudio).toBe(true)
  const persisted = await HomePractice.findOne({ studentId: student._id }).lean()
  expect(persisted?.audioContentType).toBe('audio/webm')
  expect(persisted?.audioSizeBytes).toBe(audio.length)

  const mine = await request(app).get('/api/progress/home-practice/favourites').set('Authorization', `Bearer ${studentToken}`).expect(200)
  expect(mine.body.data.reflection).toBe(saved.body.data.reflection)
  expect(mine.body.data.hasAudio).toBe(true)

  const ownAudio = await request(app)
    .get('/api/progress/home-practice/favourites/audio')
    .set('Authorization', `Bearer ${studentToken}`)
    .buffer(true)
    .parse((response, callback) => {
      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
      response.on('end', () => callback(null, Buffer.concat(chunks)))
    })
    .expect(200)
  expect(ownAudio.headers['content-type']).toContain('audio/webm')
  expect(ownAudio.body).toEqual(audio)

  const teacher = await request(app).get(`/api/students/${student._id}`).set('Authorization', `Bearer ${teacherToken}`).expect(200)
  expect(teacher.body.data.homePractice.reflection).toBe(saved.body.data.reflection)
  expect(teacher.body.data.homePractice.hasAudio).toBe(true)

  const teacherAudio = await request(app)
    .get(`/api/students/${student._id}/home-practice/favourites/audio`)
    .set('Authorization', `Bearer ${teacherToken}`)
    .buffer(true)
    .parse((response, callback) => {
      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
      response.on('end', () => callback(null, Buffer.concat(chunks)))
    })
    .expect(200)
  expect(teacherAudio.body).toEqual(audio)

  await request(app).get(`/api/students/${student._id}/home-practice/favourites/audio`).set('Authorization', `Bearer ${otherTeacherToken}`).expect(404)

  const schoolAudio = await request(app)
    .get(`/api/students/${student._id}/home-practice/favourites/audio`)
    .set('Authorization', `Bearer ${schoolToken}`)
    .buffer(true)
    .parse((response, callback) => {
      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
      response.on('end', () => callback(null, Buffer.concat(chunks)))
    })
    .expect(200)
  expect(schoolAudio.body).toEqual(audio)
})
