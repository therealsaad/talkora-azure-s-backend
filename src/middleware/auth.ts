import { NextFunction, Request, Response } from 'express'
import { verifyToken, Role } from '../utils/jwt'
import { ApiError } from '../utils/ApiError'
import { Student } from '../models/Student'

/** Verifies the bearer token and attaches { id, role, schoolId } to req.auth. Identity always comes from the token, never from the request body. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return next(ApiError.unauthorized())
  try {
    const payload = verifyToken(header.slice('Bearer '.length))
    if (payload.role === 'STUDENT') {
      const student = await Student.findOne({ _id: payload.sub, schoolId: payload.schoolId, status: 'active' })
        .select('authVersion').lean()
      if (!student || (student.authVersion || 0) !== (payload.sv || 0)) {
        return next(ApiError.unauthorized('Your student session has ended. Please sign in again.'))
      }
    }
    req.auth = { id: payload.sub, role: payload.role, schoolId: payload.schoolId }
    next()
  } catch {
    next(ApiError.unauthorized('Invalid or expired session'))
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(ApiError.unauthorized())
    if (!roles.includes(req.auth.role)) return next(ApiError.forbidden())
    next()
  }
}

/** Ensures a teacher/school-admin request targeting :schoolId (or a resource carrying schoolId) stays within their own school. */
export function requireSchoolAccess(getSchoolId: (req: Request) => string | undefined) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(ApiError.unauthorized())
    const targetSchoolId = getSchoolId(req)
    if (targetSchoolId && targetSchoolId !== req.auth.schoolId) {
      return next(ApiError.forbidden('You do not have access to this school'))
    }
    next()
  }
}

/** Ensures a student can only act on their own student record — never trusts a client-supplied studentId. */
export function requireSelfStudent(getStudentId: (req: Request) => string | undefined) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(ApiError.unauthorized())
    if (req.auth.role !== 'STUDENT') return next(ApiError.forbidden())
    const targetId = getStudentId(req)
    if (targetId && targetId !== req.auth.id) {
      return next(ApiError.forbidden('You do not have access to this student record'))
    }
    next()
  }
}
