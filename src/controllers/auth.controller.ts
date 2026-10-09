import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { AuthService } from '../services/auth.service'
import { School } from '../models/School'
import { Teacher } from '../models/Teacher'
import { Student } from '../models/Student'
import { ApiError } from '../utils/ApiError'
import { LearningEvent } from '../models/LearningEvent'
import { VoiceWarmupService } from '../services/voice-warmup.service'

export const AuthController = {
  schoolLogin: catchAsync(async (req: Request, res: Response) => {
    const { schoolCode, password } = req.body
    const result = await AuthService.loginSchool(schoolCode, password)
    ok(res, result)
  }),

  teacherLogin: catchAsync(async (req: Request, res: Response) => {
    const { schoolCode, email, password } = req.body
    const result = await AuthService.loginTeacher(schoolCode, email, password)
    ok(res, result)
  }),

  studentSchoolLookup: catchAsync(async (req: Request, res: Response) => {
    const { schoolCode, grade, className, q, page, limit } = req.body
    const result = await AuthService.listStudentProfilesForSchool({ schoolCode, grade, className, q, page, limit })
    ok(res, result)
  }),

  studentPinLogin: catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.loginStudentByPin(req.body.pin)
    ok(res, result)
    void LearningEvent.create({ studentId: result.student.id, type: 'login' }).catch(() => undefined)
    VoiceWarmupService.schedule(result.student.id)
  }),

  studentLogin: catchAsync(async (req: Request, res: Response) => {
    const { schoolCode, studentId, studentCode } = req.body
    const result = await AuthService.loginStudent(schoolCode, studentId, studentCode)
    ok(res, result)
    void LearningEvent.create({ studentId: result.student.id, type: 'login' }).catch(() => undefined)
    // Warm likely-next audio after the login response is already sent. Login never waits for TTS.
    VoiceWarmupService.schedule(result.student.id)
  }),

  me: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const { id, role, schoolId } = req.auth

    if (role === 'SCHOOL_ADMIN') {
      const school = await School.findById(id).select('name code contactEmail location status')
      if (!school) throw ApiError.notFound('School not found')
      return ok(res, { role, school })
    }
    if (role === 'TEACHER') {
      const teacher = await Teacher.findById(id).select('name email schoolId status')
      if (!teacher) throw ApiError.notFound('Teacher not found')
      const school = await School.findById(schoolId).select('name code')
      if (!school) throw ApiError.notFound('School not found')
      return ok(res, { role, teacher, school })
    }
    const student = await Student.findById(id).select('fullName grade className avatar avatarType schoolId status')
    if (!student) throw ApiError.notFound('Student not found')
    const school = await School.findById(schoolId).select('name code')
    if (!school) throw ApiError.notFound('School not found')
    ok(res, { role, student: { ...student.toObject(), avatar: student.avatar || `/talkora/characters/students/${(student.avatarType || 'BOY').toLowerCase()}/canonical.png`, avatarType: student.avatarType || 'BOY' }, school })
  }),

  logout: catchAsync(async (req: Request, res: Response) => {
    // Student sessions are revoked at the database as well as cleared in the browser.
    if (req.auth?.role === 'STUDENT') {
      await Student.updateOne({ _id: req.auth.id, schoolId: req.auth.schoolId }, { $inc: { authVersion: 1 } })
      await LearningEvent.create({ studentId: req.auth.id, type: 'logout' })
    }
    ok(res, { loggedOut: true })
  }),
}
