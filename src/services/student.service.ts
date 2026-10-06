import { FilterQuery, Types } from 'mongoose'
import { Student, IStudent } from '../models/Student'
import { hashPassword } from '../utils/password'
import { generateCode } from '../utils/idGenerator'
import { ApiError } from '../utils/ApiError'
import { Progress } from '../models/Progress'
import { ActivityAttempt } from '../models/ActivityAttempt'
import { Teacher } from '../models/Teacher'
import { activeLevelCountsByGrade } from './curriculum-level-counts'

async function assertTeacherInSchool(schoolId: string, teacherId?: string) {
  if (!teacherId) return
  if (!Types.ObjectId.isValid(teacherId) || !(await Teacher.exists({ _id: teacherId, schoolId, status: 'active' }))) {
    throw ApiError.badRequest('Choose an active teacher from this school')
  }
}

export interface ListStudentsParams {
  schoolId: string
  search?: string
  grade?: number
  className?: string
  status?: 'active' | 'inactive'
  page: number
  limit: number
  sort?: string
  teacherId?: string
}

export const StudentService = {
  async list(params: ListStudentsParams) {
    const filter: FilterQuery<IStudent> = { schoolId: params.schoolId }
    if (params.teacherId) filter.teacherId = params.teacherId
    if (params.grade) filter.grade = params.grade
    if (params.className) filter.className = params.className
    if (params.status) filter.status = params.status
    if (params.search) {
      const search = params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
      ]
    }

    const skip = (params.page - 1) * params.limit
    const sort = ['fullName', '-fullName', 'grade', '-grade', 'rollNumber', '-rollNumber', 'createdAt', '-createdAt'].includes(params.sort || '') ? params.sort! : 'fullName'

    const [students, total] = await Promise.all([
      Student.find(filter).sort(sort).skip(skip).limit(params.limit).lean(),
      Student.countDocuments(filter),
    ])

    const ids = students.map((student) => student._id)
    const [progressDocs, attemptRows, levelCounts] = await Promise.all([
      ids.length ? Progress.find({ studentId: { $in: ids } }).lean() : Promise.resolve([]),
      ids.length ? ActivityAttempt.aggregate<{ _id: Types.ObjectId; averageScore: number; learningTimeMs: number; attemptCount: number }>([
        { $match: { studentId: { $in: ids } } },
        { $group: { _id: '$studentId', averageScore: { $avg: '$score' }, learningTimeMs: { $sum: '$timeTakenMs' }, attemptCount: { $sum: 1 } } },
      ]) : Promise.resolve([]),
      activeLevelCountsByGrade(students.map((student) => student.grade)),
    ])
    const progressByStudent = new Map<string, typeof progressDocs>()
    for (const row of progressDocs) {
      const id = row.studentId.toString()
      progressByStudent.set(id, [...(progressByStudent.get(id) || []), row])
    }
    const attemptsByStudent = new Map(attemptRows.map((row) => [row._id.toString(), row]))

    return {
      students: students.map((student) => {
        const id = student._id.toString()
        const docs = progressByStudent.get(id) || []
        const attempts = attemptsByStudent.get(id)
        return {
          ...student,
          id,
          progress: {
            accuracy: attempts ? Math.round(attempts.averageScore) : 0,
            attemptCount: attempts?.attemptCount || 0,
            completedLevels: docs.reduce((sum, doc) => sum + doc.levels.filter((level) => level.status === 'completed').length, 0),
            totalLevels: levelCounts.get(student.grade) || 0,
            completedLessons: docs.reduce((sum, doc) => sum + doc.levels.reduce((count, level) => count + level.lessons.filter((lesson) => lesson.completed).length, 0), 0),
            completedActivities: docs.reduce((sum, doc) => sum + doc.levels.reduce((count, level) => count + level.lessons.reduce((items, lesson) => items + lesson.completedActivityIds.length, 0), 0), 0),
            totalXp: docs.reduce((sum, doc) => sum + doc.xp, 0),
            learningTimeMinutes: Math.round((attempts?.learningTimeMs || 0) / 60000),
            streak: Math.max(0, ...docs.map((doc) => doc.streak || 0)),
          },
        }
      }),
      total,
    }
  },

  async getById(schoolId: string, id: string, teacherId?: string) {
    const student = await Student.findOne({ _id: id, schoolId, ...(teacherId ? { teacherId } : {}) })
    if (!student) throw ApiError.notFound('Student not found')
    return student
  },

  async create(schoolId: string, input: { fullName: string; rollNumber: string; grade: number; className?: string; teacherId?: string; avatar?: string; avatarType: 'BOY' | 'GIRL' }) {
    await assertTeacherInSchool(schoolId, input.teacherId)
    const studentCode = generateCode(4)
    const passwordHash = await hashPassword(studentCode)

    try {
      const student = await Student.create({
        schoolId,
        teacherId: input.teacherId,
        fullName: input.fullName,
        rollNumber: input.rollNumber,
        grade: input.grade,
        className: input.className,
        avatar: input.avatar,
        avatarType: input.avatarType,
        passwordHash,
      })
      // studentCode is returned once, in plaintext, at creation time only — like a temporary password.
      return { student, studentCode }
    } catch (err) {
      if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
        const keyPattern = (err as { keyPattern?: Record<string, unknown> }).keyPattern
        if (keyPattern && Object.prototype.hasOwnProperty.call(keyPattern, 'rollNumber')) {
          throw ApiError.conflict('A student with this roll number already exists in this school')
        }
        throw err
      }
      throw err
    }
  },

  async update(schoolId: string, id: string, updates: Partial<Pick<IStudent, 'fullName' | 'rollNumber' | 'grade' | 'className' | 'teacherId' | 'avatar' | 'avatarType' | 'status'>>, teacherId?: string) {
    if (teacherId && updates.teacherId && updates.teacherId.toString() !== teacherId) throw ApiError.forbidden('Teachers cannot reassign students')
    await assertTeacherInSchool(schoolId, updates.teacherId?.toString())
    const student = await Student.findOneAndUpdate({ _id: id, schoolId, ...(teacherId ? { teacherId } : {}) }, updates, { new: true, runValidators: true })
    if (!student) throw ApiError.notFound('Student not found')
    return student
  },

  async deactivate(schoolId: string, id: string, teacherId?: string) {
    const student = await Student.findOneAndUpdate({ _id: id, schoolId, ...(teacherId ? { teacherId } : {}) }, { status: 'inactive' }, { new: true })
    if (!student) throw ApiError.notFound('Student not found')
    return student
  },

  async remove(schoolId: string, id: string, teacherId?: string) {
    const result = await Student.deleteOne({ _id: id, schoolId, ...(teacherId ? { teacherId } : {}) })
    if (result.deletedCount === 0) throw ApiError.notFound('Student not found')
  },

  async resetCode(schoolId: string, id: string, teacherId?: string) {
    const studentCode = generateCode(4)
    const passwordHash = await hashPassword(studentCode)
    const student = await Student.findOneAndUpdate({ _id: id, schoolId, ...(teacherId ? { teacherId } : {}) }, { passwordHash }, { new: true })
    if (!student) throw ApiError.notFound('Student not found')
    return { student, studentCode }
  },
}
