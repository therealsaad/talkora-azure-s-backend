import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { Teacher } from '../models/Teacher'
import { hashPassword } from '../utils/password'
import { ApiError } from '../utils/ApiError'

export const TeacherController = {
  create: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const { name, email, password } = req.body
    if (!name || !email || !password) throw ApiError.badRequest('name, email and password are required')
    const passwordHash = await hashPassword(password)
    const teacher = await Teacher.create({ schoolId: req.auth.schoolId, name, email: email.toLowerCase(), passwordHash })
    ok(res, { id: teacher._id, name: teacher.name, email: teacher.email }, 201)
  }),

  list: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized()
    const teachers = await Teacher.find({ schoolId: req.auth.schoolId }).select('name email status createdAt')
    ok(res, teachers.map((teacher) => ({
      id: teacher._id.toString(),
      name: teacher.name,
      email: teacher.email,
      status: teacher.status,
      createdAt: teacher.createdAt,
    })))
  }),
}
