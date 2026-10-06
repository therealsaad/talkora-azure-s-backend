import { Router } from 'express'
import { DailyChallengeController } from '../controllers/dailyChallenge.controller'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()
router.get('/today', authenticate, requireRole('STUDENT'), DailyChallengeController.today)
export default router
