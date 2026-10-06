import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { CurriculumService } from '../services/curriculum.service'
import { ProgressService } from '../services/progress.service'
import { CurriculumClass } from '../models/CurriculumClass'
import { ApiError } from '../utils/ApiError'
import { CurriculumAccessService } from '../services/curriculum-access.service'

export const CurriculumController = {
  listClasses: catchAsync(async (req: Request, res: Response) => {
    if (req.auth?.role === 'STUDENT') return ok(res, [(await CurriculumAccessService.context(req.auth.id)).curriculumClass])
    ok(res, await CurriculumService.listClasses())
  }),

  getClass: catchAsync(async (req: Request, res: Response) => {
    if (req.auth?.role === 'STUDENT') await CurriculumAccessService.assertClass(req.auth.id, req.params.id)
    ok(res, await CurriculumService.getClass(req.params.id))
  }),

  /** Levels annotated with this student's unlock status, not just raw curriculum data. */
  listLevels: catchAsync(async (req: Request, res: Response) => {
    if (req.auth?.role === 'STUDENT') await CurriculumAccessService.assertClass(req.auth.id, req.params.classId)
    const levels = await CurriculumService.listLevels(req.params.classId)
    if (req.auth?.role === 'STUDENT') {
      const progress = await ProgressService.getForStudent(req.auth.id, req.params.classId)
      const statusByLevel = new Map(progress.levels.map((l) => [l.levelId.toString(), l.status]))
      const annotated = levels.map((l) => ({ ...l, status: statusByLevel.get(l._id.toString()) ?? 'locked' }))
      return ok(res, annotated)
    }
    ok(res, levels)
  }),

  getLevel: catchAsync(async (req: Request, res: Response) => {
    if (req.auth?.role === 'STUDENT') await CurriculumAccessService.assertLevel(req.auth.id, req.params.id)
    const level = await CurriculumService.getLevel(req.params.id)
    if (req.auth?.role === 'STUDENT') {
      await ProgressService.assertLevelAccessible(req.auth.id, level.classId.toString(), level._id.toString())
    }
    ok(res, level)
  }),

  listLessons: catchAsync(async (req: Request, res: Response) => {
    if (req.auth?.role === 'STUDENT') await CurriculumAccessService.assertLevel(req.auth.id, req.params.levelId)
    ok(res, await CurriculumService.listLessons(req.params.levelId))
  }),

  getLesson: catchAsync(async (req: Request, res: Response) => {
    if (req.auth?.role === 'STUDENT') await CurriculumAccessService.assertLesson(req.auth.id, req.params.id)
    ok(res, await CurriculumService.getLesson(req.params.id))
  }),

  listActivities: catchAsync(async (req: Request, res: Response) => {
    if (req.auth?.role === 'TEACHER' || req.auth?.role === 'SCHOOL_ADMIN') {
      return ok(res, await CurriculumService.listActivitiesForTeacher(req.params.lessonId))
    }
    if (!req.auth) throw ApiError.unauthorized()
    await CurriculumAccessService.assertLesson(req.auth.id, req.params.lessonId)
    ok(res, await CurriculumService.listActivitiesForStudent(req.params.lessonId))
  }),

  getActivity: catchAsync(async (req: Request, res: Response) => {
    if (req.auth?.role === 'TEACHER' || req.auth?.role === 'SCHOOL_ADMIN') {
      return ok(res, await CurriculumService.getActivity(req.params.id))
    }
    if (!req.auth) throw ApiError.unauthorized()
    await CurriculumAccessService.assertActivity(req.auth.id, req.params.id)
    ok(res, await CurriculumService.getActivityForStudent(req.params.id))
  }),
}
