import { Router } from 'express'
import { SchoolController } from '../controllers/school.controller'
import { authenticate, requireRole } from '../middleware/auth'
import { authLimiter } from '../middleware/rateLimit'

const router = Router()

// Public: bootstrapping a new school account (in production this would likely be gated further, e.g. an admin invite).
router.post('/register', authLimiter, SchoolController.register)

router.get('/overview', authenticate, requireRole('SCHOOL_ADMIN', 'TEACHER'), SchoolController.overview)

export default router
