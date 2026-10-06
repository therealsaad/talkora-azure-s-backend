import { Router } from 'express'
import { VoiceController } from '../controllers/voice.controller'
import { authenticate, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { voiceLimiter } from '../middleware/rateLimit'
import { parseVoiceUpload } from '../middleware/voice-upload'
import { startVoiceSessionSchema, submitVoiceTranscriptSchema, synthesizeVoiceSchema, transcribeVoiceSchema } from '../schemas/voice.schema'

const router = Router()

router.use(authenticate, voiceLimiter)
router.post('/sessions', requireRole('STUDENT'), validate(startVoiceSessionSchema), VoiceController.start)
router.post('/sessions/:sessionId/transcript', requireRole('STUDENT'), validate(submitVoiceTranscriptSchema), VoiceController.submitTranscript)
router.post('/sessions/:sessionId/cancel', requireRole('STUDENT'), VoiceController.cancel)
router.post('/synthesize', requireRole('STUDENT'), validate(synthesizeVoiceSchema), VoiceController.synthesize)
router.post('/transcribe', requireRole('STUDENT'), parseVoiceUpload, validate(transcribeVoiceSchema), VoiceController.transcribe)
router.post('/warmup', requireRole('STUDENT'), VoiceController.warmup)

export default router
