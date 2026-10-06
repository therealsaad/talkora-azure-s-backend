import { Router } from 'express'
import { AnalyticsController } from '../controllers/analytics.controller'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()
router.use(authenticate, requireRole('SCHOOL_ADMIN', 'TEACHER'))
router.get('/overview', AnalyticsController.overview)
router.get('/weakest-skills', AnalyticsController.weakestSkills)
export default router
