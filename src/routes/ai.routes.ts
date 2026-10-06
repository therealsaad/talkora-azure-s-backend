import { Router } from 'express'
import { AIController } from '../controllers/ai.controller'
import { authenticate, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { aiLimiter } from '../middleware/rateLimit'
import {
  startConversationSchema,
  endConversationSchema,
  missJulieMessageSchema,
} from '../schemas/ai.schema'

const router = Router()

router.use(authenticate, requireRole('STUDENT'), aiLimiter)

// Conversation lifecycle
router.post('/conversation/start', validate(startConversationSchema), AIController.startConversation)
router.post('/conversation/turn', validate(missJulieMessageSchema), AIController.converse)
router.post('/conversation/:conversationId/end', validate(endConversationSchema), AIController.endConversation)

// Miss Julie turn (compatibility alias) & recommendation
router.post('/miss-julie', validate(missJulieMessageSchema), AIController.missJulie)
router.get('/recommendation', AIController.recommendation)

export default router
