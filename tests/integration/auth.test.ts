import request from 'supertest'
import { createApp } from '../../src/app'
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from './dbTestUtils'
import { School } from '../../src/models/School'
import { Teacher } from '../../src/models/Teacher'
import { Student } from '../../src/models/Student'
import { hashPassword } from '../../src/utils/password'
import jwt from 'jsonwebtoken'
import { env } from '../../src/config/env'
import { signToken } from '../../src/utils/jwt'

const app = createApp()

beforeAll(async () => connectTestDatabase())
afterAll(async () => disconnectTestDatabase())
afterEach(async () => clearTestDatabase())

async function seedSchoolTeacherStudent() {
  const school = await School.create({ name: 'Test School', code: 'TEST001', passwordHash: await hashPassword('schoolpass'), status: 'active' })
  const teacher = await Teacher.create({ schoolId: school._id, name: 'Ms Test', email: 'teacher@test.dev', passwordHash: await hashPassword('teacherpass'), status: 'active' })
  const student = await Student.create({
    schoolId: school._id,
    teacherId: teacher._id,
    fullName: 'Test Student',
    rollNumber: '01',
    grade: 4,
    studentCode: 'ABCD',
    passwordHash: await hashPassword('ABCD'),
    status: 'active',
  })
  return { school, teacher, student }
}

describe('POST /api/auth/school/login', () => {
  it('logs in with correct credentials', async () => {
    await seedSchoolTeacherStudent()
    const res = await request(app).post('/api/auth/school/login').send({ schoolCode: 'TEST001', password: 'schoolpass' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.token).toBeDefined()
  })

  it('rejects incorrect password', async () => {
    await seedSchoolTeacherStudent()
    const res = await request(app).post('/api/auth/school/login').send({ schoolCode: 'TEST001', password: 'wrongpassword' })
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })
})

describe('POST /api/auth/student/login', () => {
  it('logs in with correct student code and survives GET /api/auth/me', async () => {
    const { school, student } = await seedSchoolTeacherStudent()
    const loginRes = await request(app)
      .post('/api/auth/student/login')
      .send({ schoolCode: school.code, studentId: student._id.toString(), studentCode: 'ABCD' })
    expect(loginRes.status).toBe(200)
    const token = loginRes.body.data.token

    const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
    expect(meRes.status).toBe(200)
    expect(meRes.body.data.role).toBe('STUDENT')
    expect(meRes.body.data.student.fullName).toBe('Test Student')
  })

  it('rejects a wrong student code', async () => {
    const { school, student } = await seedSchoolTeacherStudent()
    const res = await request(app)
      .post('/api/auth/student/login')
      .send({ schoolCode: school.code, studentId: student._id.toString(), studentCode: 'WRONG' })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/auth/me without a token', () => {
  it('returns 401', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('returns 401 for an invalid bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer definitely-not-a-jwt')

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('returns 401 for an expired bearer token', async () => {
    const { school, student } = await seedSchoolTeacherStudent()
    const token = jwt.sign(
      {
        sub: student._id.toString(),
        role: 'STUDENT',
        schoolId: school._id.toString(),
      },
      env.jwtSecret,
      { expiresIn: -1 },
    )

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })
})

describe('POST /api/auth/teacher/login', () => {
  it('uses the school code to distinguish teachers with the same email', async () => {
    await seedSchoolTeacherStudent()
    const otherSchool = await School.create({ name: 'Other School', code: 'OTHER01', passwordHash: await hashPassword('schoolpass'), status: 'active' })
    const otherTeacher = await Teacher.create({ schoolId: otherSchool._id, name: 'Other Teacher', email: 'teacher@test.dev', passwordHash: await hashPassword('otherpass'), status: 'active' })
    const login = await request(app).post('/api/auth/teacher/login').send({ schoolCode: 'OTHER01', email: 'teacher@test.dev', password: 'otherpass' })
    expect(login.status).toBe(200)
    expect(login.body.data.teacher.id).toBe(otherTeacher._id.toString())
    expect(login.body.data.school.code).toBe('OTHER01')
    const missingSchool = await request(app).post('/api/auth/teacher/login').send({ email: 'teacher@test.dev', password: 'otherpass' })
    expect(missingSchool.status).toBe(400)
  })
})

describe('teacher directory', () => {
  it('reports a duplicate teacher email as a conflict in the same school', async () => {
    const { school } = await seedSchoolTeacherStudent()
    const token = signToken({ sub: school._id.toString(), role: 'SCHOOL_ADMIN', schoolId: school._id.toString() })
    const res = await request(app).post('/api/teachers').set('Authorization', `Bearer ${token}`).send({ name: 'Another Teacher', email: 'teacher@test.dev', password: 'safe-password-123' })
    expect(res.status).toBe(409)
  })
})

describe('role-protected API boundaries', () => {
  it('returns 403 when a school administrator calls a student-only endpoint', async () => {
    const { school } = await seedSchoolTeacherStudent()
    const token = signToken({
      sub: school._id.toString(),
      role: 'SCHOOL_ADMIN',
      schoolId: school._id.toString(),
    })

    const res = await request(app)
      .get('/api/students/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })

  it('returns 403 when a student calls an educator-only endpoint', async () => {
    const { school, student } = await seedSchoolTeacherStudent()
    const token = signToken({
      sub: student._id.toString(),
      role: 'STUDENT',
      schoolId: school._id.toString(),
    })

    const res = await request(app)
      .get('/api/schools/overview')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })
})
