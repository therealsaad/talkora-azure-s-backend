import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { authLimiter } from '../middleware/rateLimit'
import { schoolLoginSchema, teacherLoginSchema, studentSchoolLookupSchema, studentLoginSchema, studentPinLoginSchema } from '../schemas/auth.schema'

const router = Router()

router.post('/school/login', authLimiter, validate(schoolLoginSchema), AuthController.schoolLogin)
router.post('/teacher/login', authLimiter, validate(teacherLoginSchema), AuthController.teacherLogin)
// Public student-name rosters are disabled: student sign-in is PIN-only, and minors' names must not be enumerable.
router.post('/student/login', authLimiter, validate(studentLoginSchema), AuthController.studentLogin)
router.post('/student/pin-login', authLimiter, validate(studentPinLoginSchema), AuthController.studentPinLogin)

router.get('/me', authenticate, AuthController.me)
router.post('/logout', authenticate, AuthController.logout)

export default router
