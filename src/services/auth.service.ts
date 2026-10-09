import { School } from '../models/School'
import { Teacher } from '../models/Teacher'
import { Student } from '../models/Student'
import { hashPassword, comparePassword } from '../utils/password'
import { signToken } from '../utils/jwt'
import { ApiError } from '../utils/ApiError'
import { generateCode } from '../utils/idGenerator'
import { pinLookup } from '../utils/student-pin'

export const AuthService = {
  async loginSchool(schoolCode: string, password: string) {
    const school = await School.findOne({ code: schoolCode.toUpperCase(), status: 'active' }).select('+passwordHash')
    if (!school) throw ApiError.unauthorized('Invalid school code or password')
    const valid = await comparePassword(password, school.passwordHash)
    if (!valid) throw ApiError.unauthorized('Invalid school code or password')

    const token = signToken({ sub: school._id.toString(), role: 'SCHOOL_ADMIN', schoolId: school._id.toString() })
    return { token, school: { id: school._id, name: school.name, code: school.code } }
  },

  async loginTeacher(schoolCode: string, email: string, password: string) {
    const school = await School.findOne({ code: schoolCode.trim().toUpperCase(), status: 'active' }).select('name code')
    if (!school) throw ApiError.unauthorized('Invalid school code, email or password')
    const teacher = await Teacher.findOne({ schoolId: school._id, email: email.trim().toLowerCase(), status: 'active' }).select('+passwordHash')
    if (!teacher) throw ApiError.unauthorized('Invalid email or password')
    const valid = await comparePassword(password, teacher.passwordHash)
    if (!valid) throw ApiError.unauthorized('Invalid email or password')

    const token = signToken({ sub: teacher._id.toString(), role: 'TEACHER', schoolId: teacher.schoolId.toString() })
    return { token, teacher: { id: teacher._id.toString(), name: teacher.name, email: teacher.email }, school: { id: school._id.toString(), name: school.name, code: school.code } }
  },

  /** School-scoped, paginated profile discovery for student login. */
  async listStudentProfilesForSchool(input: { schoolCode: string; grade?: number; className?: string; q?: string; page: number; limit: number }) {
    const school = await School.findOne({ code: input.schoolCode.toUpperCase(), status: 'active' })
    if (!school) throw ApiError.unauthorized('Invalid school code')

    const baseFilter = { schoolId: school._id, status: 'active' as const }
    const filter: Record<string, unknown> = { ...baseFilter }
    if (input.grade !== undefined) filter.grade = input.grade
    if (input.className) filter.className = input.className
    if (input.q) filter.fullName = { $regex: input.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }

    const skip = (input.page - 1) * input.limit
    const [students, total, facetRows] = await Promise.all([
      Student.find(filter).select('fullName grade className avatar avatarType').sort({ fullName: 1 }).skip(skip).limit(input.limit).lean(),
      Student.countDocuments(filter),
      Student.aggregate<{ _id: { grade: number; className?: string }; count: number }>([
        { $match: baseFilter },
        { $group: { _id: { grade: '$grade', className: '$className' }, count: { $sum: 1 } } },
        { $sort: { '_id.grade': 1, '_id.className': 1 } },
      ]),
    ])

    const grades = Array.from(new Set(facetRows.map((row) => row._id.grade))).sort((a, b) => a - b)
    const classes = facetRows.map((row) => ({ grade: row._id.grade, className: row._id.className || `Class ${row._id.grade}`, count: row.count }))
    return {
      school: { id: school._id.toString(), name: school.name, code: school.code },
      students: students.map((student) => ({
        id: student._id.toString(),
        fullName: student.fullName,
        grade: student.grade,
        className: student.className,
        avatar: student.avatar,
        avatarType: student.avatarType || 'BOY',
      })),
      filters: { grades, classes },
      pagination: { page: input.page, limit: input.limit, total, pages: Math.ceil(total / input.limit) || 0 },
    }
  },

  /** Step 2 of student login: verify the selected profile's code against the stored hash. */
  async loginStudent(schoolCode: string, studentId: string, studentCode: string) {
    const school = await School.findOne({ code: schoolCode.toUpperCase(), status: 'active' })
    if (!school) throw ApiError.unauthorized('Invalid school code')

    const student = await Student.findOne({ _id: studentId, schoolId: school._id, status: 'active' }).select('+passwordHash')
    if (!student) throw ApiError.unauthorized('Invalid student profile')

    const valid = await comparePassword(studentCode.toUpperCase(), student.passwordHash)
    if (!valid) throw ApiError.unauthorized('Invalid student code')

    student.lastLoginAt = new Date()
    await student.save()

    const token = signToken({ sub: student._id.toString(), role: 'STUDENT', schoolId: school._id.toString(), sv: student.authVersion || 0 })
    return {
      token,
      student: { id: student._id.toString(), fullName: student.fullName, rollNumber: student.rollNumber, grade: student.grade, className: student.className, avatar: student.avatar || `/talkora/characters/students/${(student.avatarType || 'BOY').toLowerCase()}/canonical.png`, avatarType: student.avatarType || 'BOY' },
      school: { id: school._id.toString(), name: school.name, code: school.code },
    }
  },

  /** PIN-only sign-in. Old accounts need their PIN reset by school staff first. */
  async loginStudentByPin(pin: string) {
    const student = await Student.findOne({ pinLookup: pinLookup(pin), status: 'active' }).select('+passwordHash')
    if (!student || !(await comparePassword(pin, student.passwordHash))) throw ApiError.unauthorized('Invalid PIN')
    const school = await School.findOne({ _id: student.schoolId, status: 'active' }).select('name code')
    if (!school) throw ApiError.unauthorized('Invalid PIN')
    student.lastLoginAt = new Date()
    await student.save()
    return {
      token: signToken({ sub: student._id.toString(), role: 'STUDENT', schoolId: student.schoolId.toString(), sv: student.authVersion || 0 }),
      student: { id: student._id.toString(), fullName: student.fullName, rollNumber: student.rollNumber, grade: student.grade, className: student.className, avatar: student.avatar || `/talkora/characters/students/${(student.avatarType || 'BOY').toLowerCase()}/canonical.png`, avatarType: student.avatarType || 'BOY' },
      school: { id: school._id.toString(), name: school.name, code: school.code },
    }
  },

  async createSchool(input: { name: string; code?: string; password: string; contactEmail?: string; location?: string }) {
    const code = (input.code ?? generateCode(6)).toUpperCase()
    const existing = await School.findOne({ code })
    if (existing) throw ApiError.conflict('School code already in use')
    const passwordHash = await hashPassword(input.password)
    const school = await School.create({ name: input.name, code, passwordHash, contactEmail: input.contactEmail, location: input.location })
    return school
  },
}
