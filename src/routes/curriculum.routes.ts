import { Router } from 'express'
import { CurriculumController } from '../controllers/curriculum.controller'
import { authenticate } from '../middleware/auth'

const router = Router()

// Curriculum browsing is available to any authenticated role; student-specific unlock status
// is layered in by the controller when req.auth.role === 'STUDENT'.
router.use(authenticate)

router.get('/classes', CurriculumController.listClasses)
router.get('/classes/:id', CurriculumController.getClass)
router.get('/classes/:classId/levels', CurriculumController.listLevels)

router.get('/levels/:id', CurriculumController.getLevel)
router.get('/levels/:levelId/lessons', CurriculumController.listLessons)

router.get('/lessons/:id', CurriculumController.getLesson)
router.get('/lessons/:lessonId/activities', CurriculumController.listActivities)

router.get('/activities/:id', CurriculumController.getActivity)

export default router
