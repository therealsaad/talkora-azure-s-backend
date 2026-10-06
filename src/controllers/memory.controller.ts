import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { MemoryService } from '../services/memory.service'
import { ApiError } from '../utils/ApiError'

export const MemoryController = {
  mine: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    ok(res, await MemoryService.listForStudent(req.auth.id))
  }),
}
