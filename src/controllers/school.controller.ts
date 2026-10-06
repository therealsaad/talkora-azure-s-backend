import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { AuthService } from '../services/auth.service'
import { AnalyticsService } from '../services/analytics.service'
import { ApiError } from '../utils/ApiError'

export const SchoolController = {
  register: catchAsync(async (req: Request, res: Response) => {
    const { name, code, password, contactEmail, location } = req.body
    if (!name || !password) throw ApiError.badRequest('name and password are required')
    const school = await AuthService.createSchool({ name, code, password, contactEmail, location })
    ok(res, { id: school._id, name: school.name, code: school.code }, 201)
  }),

  overview: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const rows = await AnalyticsService.schoolOverview(req.auth.schoolId, req.auth.role === 'TEACHER' ? req.auth.id : undefined)
    ok(res, rows)
  }),
}
