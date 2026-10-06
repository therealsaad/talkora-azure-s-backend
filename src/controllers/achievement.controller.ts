import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { AchievementService } from '../services/achievement.service'
import { ApiError } from '../utils/ApiError'

export const AchievementController = {
  mine: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    ok(res, await AchievementService.listForStudent(req.auth.id))
  }),

  catalog: catchAsync(async (_req: Request, res: Response) => {
    ok(res, await AchievementService.listCatalog())
  }),
}
