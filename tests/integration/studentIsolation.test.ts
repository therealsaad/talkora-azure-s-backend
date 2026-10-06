import request from 'supertest'
import { createApp } from '../../src/app'
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from './dbTestUtils'
import { School } from '../../src/models/School'
import { Student } from '../../src/models/Student'
import { hashPassword } from '../../src/utils/password'
import { signToken } from '../../src/utils/jwt'

const app = createApp()

beforeAll(async () => connectTestDatabase())
afterAll(async () => disconnectTestDatabase())
afterEach(async () => clearTestDatabase())

describe('student data isolation', () => {
  it('lets a student update only their own avatar through token identity', async () => {
    const school = await School.create({ name: 'School', code: 'ISO000', passwordHash: await hashPassword('pw'), status: 'active' })
    const student = await Student.create({ schoolId: school._id, fullName: 'A', rollNumber: '01', grade: 4, studentCode: 'AAAA', passwordHash: await hashPassword('AAAA'), status: 'active' })
    const token = signToken({ sub: student._id.toString(), role: 'STUDENT', schoolId: school._id.toString() })

    const res = await request(app)
      .patch('/api/students/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatar: 'diya', avatarType: 'GIRL', studentId: 'someone-else' })

    expect(res.status).toBe(200)
    expect(res.body.data.avatar).toBe('diya')
    expect(res.body.data.avatarType).toBe('GIRL')
    expect(res.body.data._id).toBe(student._id.toString())
  })

  it('student A cannot fetch student B via the school student-management endpoint (requires school/teacher role)', async () => {
    const school = await School.create({ name: 'School', code: 'ISO001', passwordHash: await hashPassword('pw'), status: 'active' })
    const studentA = await Student.create({ schoolId: school._id, fullName: 'A', rollNumber: '01', grade: 4, studentCode: 'AAAA', passwordHash: await hashPassword('AAAA'), status: 'active' })
    const studentB = await Student.create({ schoolId: school._id, fullName: 'B', rollNumber: '02', grade: 4, studentCode: 'BBBB', passwordHash: await hashPassword('BBBB'), status: 'active' })

    const tokenA = signToken({ sub: studentA._id.toString(), role: 'STUDENT', schoolId: school._id.toString() })

    // A student token has no access to the /api/students/:id admin route at all.
    const res = await request(app).get(`/api/students/${studentB._id}`).set('Authorization', `Bearer ${tokenA}`)
    expect(res.status).toBe(403)
  })

  it("a student's own progress endpoint only ever reflects their own token identity, never a body-supplied id", async () => {
    const school = await School.create({ name: 'School', code: 'ISO002', passwordHash: await hashPassword('pw'), status: 'active' })
    const studentA = await Student.create({ schoolId: school._id, fullName: 'A', rollNumber: '01', grade: 4, studentCode: 'AAAA', passwordHash: await hashPassword('AAAA'), status: 'active' })
    const tokenA = signToken({ sub: studentA._id.toString(), role: 'STUDENT', schoolId: school._id.toString() })

    // Even if a malicious client tried to smuggle another studentId in the body, the route
    // has no such field — identity comes exclusively from the verified token.
    const res = await request(app).get('/api/students/me').set('Authorization', `Bearer ${tokenA}`)
    expect(res.status).toBe(200)
    expect(res.body.data._id).toBe(studentA._id.toString())
  })

  it('a teacher from one school cannot manage students of another school', async () => {
    const { Teacher } = await import('../../src/models/Teacher')
    const schoolX = await School.create({ name: 'X', code: 'SCHX01', passwordHash: await hashPassword('pw'), status: 'active' })
    const schoolY = await School.create({ name: 'Y', code: 'SCHY01', passwordHash: await hashPassword('pw'), status: 'active' })
    const teacherX = await Teacher.create({ schoolId: schoolX._id, name: 'T', email: 't@x.dev', passwordHash: await hashPassword('pw'), status: 'active' })
    const studentY = await Student.create({ schoolId: schoolY._id, fullName: 'Y-Student', rollNumber: '01', grade: 4, studentCode: 'YYYY', passwordHash: await hashPassword('YYYY'), status: 'active' })

    const tokenTeacherX = signToken({ sub: teacherX._id.toString(), role: 'TEACHER', schoolId: schoolX._id.toString() })
    const res = await request(app).get(`/api/students/${studentY._id}`).set('Authorization', `Bearer ${tokenTeacherX}`)
    // The service scopes the query by req.auth.schoolId, so a cross-school id simply isn't found.
    expect(res.status).toBe(404)
  })

  it('rejects assigning a new student to a teacher in another school', async () => {
    const { Teacher } = await import('../../src/models/Teacher')
    const schoolX = await School.create({ name: 'X', code: 'SCHX02', passwordHash: await hashPassword('pw'), status: 'active' })
    const schoolY = await School.create({ name: 'Y', code: 'SCHY02', passwordHash: await hashPassword('pw'), status: 'active' })
    const teacherY = await Teacher.create({ schoolId: schoolY._id, name: 'Other teacher', email: 'other@y.dev', passwordHash: await hashPassword('pw'), status: 'active' })
    const token = signToken({ sub: schoolX._id.toString(), role: 'SCHOOL_ADMIN', schoolId: schoolX._id.toString() })
    const res = await request(app).post('/api/students').set('Authorization', `Bearer ${token}`).send({ fullName: 'New Student', rollNumber: '02', grade: 4, avatarType: 'BOY', teacherId: teacherY._id.toString() })
    expect(res.status).toBe(400)
    expect(await Student.countDocuments({ schoolId: schoolX._id })).toBe(0)
  })

  it('shows an admin-enrolled student in the assigned teacher directory', async () => {
    const { Teacher } = await import('../../src/models/Teacher')
    const school = await School.create({ name: 'Assigned School', code: 'SCHAS1', passwordHash: await hashPassword('pw'), status: 'active' })
    const teacher = await Teacher.create({ schoolId: school._id, name: 'Ms Teacher', email: 'teacher@assigned.dev', passwordHash: await hashPassword('pw'), status: 'active' })
    const adminToken = signToken({ sub: school._id.toString(), role: 'SCHOOL_ADMIN', schoolId: school._id.toString() })
    const teacherToken = signToken({ sub: teacher._id.toString(), role: 'TEACHER', schoolId: school._id.toString() })

    const created = await request(app).post('/api/students').set('Authorization', `Bearer ${adminToken}`).send({ fullName: 'Assigned Student', rollNumber: '13', grade: 4, avatarType: 'BOY', teacherId: teacher._id.toString() })
    expect(created.status).toBe(201)

    const directory = await request(app).get('/api/students').set('Authorization', `Bearer ${teacherToken}`)
    expect(directory.status).toBe(200)
    expect(directory.body.data.students.map((student: { fullName: string }) => student.fullName)).toContain('Assigned Student')
    expect(directory.body.data.students[0].progress.attemptCount).toBe(0)
  })
})
