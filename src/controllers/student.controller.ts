import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { StudentService } from '../services/student.service'
import { ProgressService } from '../services/progress.service'
import { CurriculumClass } from '../models/CurriculumClass'
import { ApiError } from '../utils/ApiError'
import { AnalyticsService } from '../services/analytics.service'
import { StudentCurriculumService } from '../services/student-curriculum.service'
import { Progress } from '../models/Progress'
import { Student } from '../models/Student'
import { HomePractice } from '../models/HomePractice'

export const StudentController = {
  list: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const { search, grade, className, status, page, limit, sort } = req.query as unknown as {
      search?: string; grade?: number; className?: string; status?: 'active' | 'inactive'; page: number; limit: number; sort?: string
    }
    const { students, total } = await StudentService.list({ schoolId: req.auth.schoolId, search, grade, className, status, page, limit, sort, teacherId: req.auth.role === 'TEACHER' ? req.auth.id : undefined })
    ok(res, { students, total, page, limit })
  }),

  get: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const detail = await AnalyticsService.studentDetail(req.auth.schoolId, req.params.id, req.auth.role === 'TEACHER' ? req.auth.id : undefined)
    if (!detail) throw ApiError.notFound('Student not found')
    const progressDocs = await Progress.find({ studentId: req.params.id }).select('levels').lean()
    const completedActivities = progressDocs.reduce((total, doc) => total + doc.levels.reduce(
      (levelTotal, level) => levelTotal + level.lessons.reduce((lessonTotal, lesson) => lessonTotal + lesson.completedActivityIds.length, 0), 0,
    ), 0)
    const completedLessons = progressDocs.reduce((total, doc) => total + doc.levels.reduce(
      (levelTotal, level) => levelTotal + level.lessons.filter((lesson) => lesson.completed).length, 0,
    ), 0)
    ok(res, { ...detail.student, progress: { ...detail.progress, completedActivities, completedLessons }, recentAttempts: detail.recentAttempts, homePractice: detail.homePractice })
  }),

  getHomePracticeAudio: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || !['SCHOOL_ADMIN', 'TEACHER'].includes(req.auth.role)) throw ApiError.forbidden()
    const student = await Student.findOne({
      _id: req.params.id,
      schoolId: req.auth.schoolId,
      ...(req.auth.role === 'TEACHER' ? { teacherId: req.auth.id } : {}),
    }).select('_id').lean()
    if (!student) throw ApiError.notFound('Student not found')
    const submission = await HomePractice.findOne({ studentId: student._id, unitKey: 'UNIT1_FAVOURITES' }).select('audioData audioContentType')
    if (!submission?.audioData) throw ApiError.notFound('Home practice recording not found')
    res.setHeader('Content-Type', submission.audioContentType || 'application/octet-stream')
    res.setHeader('Content-Length', submission.audioData.length)
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.send(submission.audioData)
  }),

  create: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const { student, studentCode } = await StudentService.create(req.auth.schoolId, { ...req.body, teacherId: req.auth.role === 'TEACHER' ? req.auth.id : req.body.teacherId })
    // studentCode is only ever returned here, at creation, in plaintext — like a one-time temporary password.
    ok(res, { student, studentCode }, 201)
  }),

  update: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const student = await StudentService.update(req.auth.schoolId, req.params.id, req.body, req.auth.role === 'TEACHER' ? req.auth.id : undefined)
    ok(res, student)
  }),

  deactivate: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const student = await StudentService.deactivate(req.auth.schoolId, req.params.id, req.auth.role === 'TEACHER' ? req.auth.id : undefined)
    ok(res, student)
  }),

  remove: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    await StudentService.remove(req.auth.schoolId, req.params.id, req.auth.role === 'TEACHER' ? req.auth.id : undefined)
    ok(res, { deleted: true })
  }),

  resetCode: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const { student, studentCode } = await StudentService.resetCode(req.auth.schoolId, req.params.id, req.auth.role === 'TEACHER' ? req.auth.id : undefined)
    ok(res, { student, studentCode })
  }),

  // --- Self-service (student role) ---

  myProfile: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const student = await StudentService.getById(req.auth.schoolId, req.auth.id)
    ok(res, student)
  }),

  updateMyAvatar: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const student = await StudentService.update(req.auth.schoolId, req.auth.id, {
      avatar: req.body.avatar,
      avatarType: req.body.avatarType,
    })
    ok(res, student)
  }),

  // myProgress: catchAsync(async (req: Request, res: Response) => {
  //   if (!req.auth) throw ApiError.unauthorized()
  //   const klass = await CurriculumClass.findOne({ grade: req.query.grade ? Number(req.query.grade) : undefined })
  //   const student = await StudentService.getById(req.auth.schoolId, req.auth.id)
  //   const resolvedClass = klass ?? (await CurriculumClass.findOne({ grade: student.grade }))
  //   if (!resolvedClass) throw ApiError.notFound('No curriculum found for this grade yet')
  //   const progress = await ProgressService.getForStudent(req.auth.id, resolvedClass._id.toString())
  //   ok(res, progress)
  // }),
  myProgress: catchAsync(async (req: Request, res: Response) => {
  if (!req.auth) throw ApiError.unauthorized()

  const student = await StudentService.getById(
    req.auth.schoolId,
    req.auth.id
  )

  const curriculumClass = await CurriculumClass.findOne({
    grade: student.grade,
    status: 'active',
  })

  if (!curriculumClass) {
    throw ApiError.notFound('No curriculum found for this grade yet')
  }

  const progress = await ProgressService.getForStudent(
    req.auth.id,
    curriculumClass._id.toString()
  )

  ok(res, progress)
}),
  myCurriculum: catchAsync(async (req: Request, res: Response) => {
  if (!req.auth) {
    throw ApiError.unauthorized()
  }

  try {
    const result =
      await StudentCurriculumService.get(
        req.auth.id,
      )

    ok(res, result)
  } catch (error) {
    console.error(
      '[MY CURRICULUM ERROR]',
      error,
    )

    throw error
  }
}),
  myCurrentCurriculum: catchAsync(async (req: Request, res: Response) => {
  if (!req.auth) {
    throw ApiError.unauthorized()
  }

  try {
    const result =
      await StudentCurriculumService.current(
        req.auth.id,
      )

    ok(res, result)
  } catch (error) {
    console.error(
      '[MY CURRENT CURRICULUM ERROR]',
      error,
    )

    throw error
  }
}),
}
