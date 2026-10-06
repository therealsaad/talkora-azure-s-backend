import { Router } from 'express'
import authRoutes from './auth.routes'
import schoolRoutes from './school.routes'
import teacherRoutes from './teacher.routes'
import studentRoutes from './student.routes'
import curriculumRoutes from './curriculum.routes'
import progressRoutes from './progress.routes'
import achievementRoutes from './achievement.routes'
import mistakeRoutes from './mistake.routes'
import memoryRoutes from './memory.routes'
import aiRoutes from './ai.routes'
import voiceRoutes from './voice.routes'
import analyticsRoutes from './analytics.routes'
import dailyChallengeRoutes from './dailyChallenge.routes'
import educatorAIRoutes from './educator-ai.routes'

const router = Router()

router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }))

router.use('/auth', authRoutes)
router.use('/schools', schoolRoutes)
router.use('/teachers', teacherRoutes)
router.use('/students', studentRoutes)
router.use('/', curriculumRoutes) // exposes /classes, /levels, /lessons, /activities
router.use('/progress', progressRoutes)
router.use('/achievements', achievementRoutes)
router.use('/mistakes', mistakeRoutes)
router.use('/memory', memoryRoutes)
router.use('/ai', aiRoutes)
router.use('/voice', voiceRoutes)
router.use('/analytics', analyticsRoutes)
router.use('/daily-challenges', dailyChallengeRoutes)
router.use('/educator/ai', educatorAIRoutes)
router.use('/educator-ai', educatorAIRoutes) // Backward compatibility for educator dashboard clients already using this URL.

export default router
