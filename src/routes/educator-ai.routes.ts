import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { educatorChatRequestSchema } from '../schemas/educator-ai.schema'
import { EducatorAIController } from '../controllers/educator-ai.controller'

const router = Router()
router.post('/chat', authenticate, requireRole('SCHOOL_ADMIN', 'TEACHER'), validate(educatorChatRequestSchema), EducatorAIController.chat)
export default router
