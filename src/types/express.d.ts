import { Role } from '../utils/jwt'

declare global {
  namespace Express {
    interface Request {
      auth?: {
        id: string
        role: Role
        schoolId: string
      }
    }
  }
}

export {}
