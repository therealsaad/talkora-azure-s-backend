import jwt, { SignOptions } from 'jsonwebtoken'
import { env } from '../config/env'

export type Role = 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT'

export interface TokenPayload {
  sub: string // the authenticated entity's Mongo _id (school, teacher, or student)
  role: Role
  schoolId: string
}

export function signToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'] }
  return jwt.sign(payload, env.jwtSecret, options)
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtSecret) as TokenPayload
}
