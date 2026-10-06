import { Router } from 'express'
import { MemoryController } from '../controllers/memory.controller'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()
router.get('/mine', authenticate, requireRole('STUDENT'), MemoryController.mine)
export default router
