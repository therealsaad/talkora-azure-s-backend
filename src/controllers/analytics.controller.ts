import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { AnalyticsService } from '../services/analytics.service'
import { ApiError } from '../utils/ApiError'

export const AnalyticsController = {
  overview: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    ok(res, await AnalyticsService.analyticsOverview(req.auth.schoolId, req.auth.role === 'TEACHER' ? req.auth.id : undefined))
  }),

  weakestSkills: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    ok(res, await AnalyticsService.weakestSkillsForSchool(req.auth.schoolId, 5, req.auth.role === 'TEACHER' ? req.auth.id : undefined))
  }),
}
