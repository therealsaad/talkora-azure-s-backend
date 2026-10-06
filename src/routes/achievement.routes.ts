import { Router } from 'express'
import { AchievementController } from '../controllers/achievement.controller'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()

router.get('/catalog', authenticate, AchievementController.catalog)
router.get('/mine', authenticate, requireRole('STUDENT'), AchievementController.mine)

export default router
