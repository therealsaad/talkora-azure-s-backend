import { Router } from 'express'
import { TeacherController } from '../controllers/teacher.controller'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()

router.use(authenticate, requireRole('SCHOOL_ADMIN'))
router.get('/', TeacherController.list)
router.post('/', TeacherController.create)

export default router
