import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { ApiError } from '../utils/ApiError'
import { EducatorAIService } from '../services/educator-ai.service'

export const EducatorAIController = { chat: catchAsync(async (req: Request, res: Response) => {
  if (!req.auth || !['SCHOOL_ADMIN', 'TEACHER'].includes(req.auth.role)) throw ApiError.forbidden()
  ok(res, await EducatorAIService.chat({ schoolId: req.auth.schoolId, role: req.auth.role as 'SCHOOL_ADMIN' | 'TEACHER', educatorId: req.auth.id, ...req.body }))
}) }
