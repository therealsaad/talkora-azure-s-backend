import { Router } from 'express'
import { ProgressController } from '../controllers/progress.controller'
import { authenticate, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { submitAttemptSchema } from '../schemas/activity.schema'
import { saveHomePracticeSchema } from '../schemas/homePractice.schema'
import { parseVoiceUpload } from '../middleware/voice-upload'

const router = Router()

router.use(authenticate, requireRole('STUDENT'))
router.get('/classes/:classId', ProgressController.getForClass)
router.get('/home-practice/favourites', ProgressController.getHomePractice)
router.get('/home-practice/favourites/audio', ProgressController.getHomePracticeAudio)
router.put('/home-practice/favourites', parseVoiceUpload, validate(saveHomePracticeSchema), ProgressController.saveHomePractice)
router.post('/activities/:activityId/attempts', validate(submitAttemptSchema), ProgressController.submitAttempt)
router.post('/activities/:activityId/complete-local', validate(submitAttemptSchema.pick({ params: true }).extend({ body: submitAttemptSchema.shape.body.pick({ answer: true }) })), ProgressController.completeLocalActivity)

export default router
