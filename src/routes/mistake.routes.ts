import { Router } from 'express'
import { MistakeController } from '../controllers/mistake.controller'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()
router.get('/mine', authenticate, requireRole('STUDENT'), MistakeController.mine)
export default router
