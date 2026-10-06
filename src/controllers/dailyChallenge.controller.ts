import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { DailyChallengeService } from '../services/dailyChallenge.service'
import { CurriculumClass } from '../models/CurriculumClass'
import { ApiError } from '../utils/ApiError'

export const DailyChallengeController = {
  today: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    const { Student } = await import('../models/Student.js')
    const student = await Student.findById(req.auth.id)
    if (!student) throw ApiError.notFound('Student not found')
    const klass = await CurriculumClass.findOne({ grade: student.grade })
    if (!klass) return ok(res, null)
    ok(res, await DailyChallengeService.getTodayForClass(klass._id.toString()))
  }),
}
