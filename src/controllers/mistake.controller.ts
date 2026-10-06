import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { MistakeService } from '../services/mistake.service'
import { ApiError } from '../utils/ApiError'

export const MistakeController = {
  mine: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    ok(res, await MistakeService.listForStudent(req.auth.id))
  }),
}
