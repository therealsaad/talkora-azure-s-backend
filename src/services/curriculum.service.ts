import { CurriculumClass } from '../models/CurriculumClass'
import { Level } from '../models/Level'
import { Lesson } from '../models/Lesson'
import { Activity } from '../models/Activity'
import { ApiError } from '../utils/ApiError'

export const CurriculumService = {
  async listClasses() {
    return CurriculumClass.find({ status: 'active' }).sort('order').lean()
  },

  async getClass(id: string) {
    const klass = await CurriculumClass.findById(id).lean()
    if (!klass) throw ApiError.notFound('Class not found')
    return klass
  },

  async listLevels(classId: string) {
    await this.getClass(classId)
    return Level.find({ classId, status: 'active' }).sort('order').lean()
  },

  async getLevel(id: string) {
    const level = await Level.findById(id).lean()
    if (!level) throw ApiError.notFound('Level not found')
    return level
  },

  async listLessons(levelId: string) {
    await this.getLevel(levelId)
    return Lesson.find({ levelId, status: 'active' }).sort('order').lean()
  },

  async getLesson(id: string) {
    const lesson = await Lesson.findById(id).lean()
    if (!lesson) throw ApiError.notFound('Lesson not found')
    return lesson
  },

  /** Student-facing: never includes `answer`/`answerConfig` — the backend evaluates answers, not the client. */
  async listActivitiesForStudent(lessonId: string) {
    await this.getLesson(lessonId)
    return Activity.find({ lessonId, status: 'active' }).select('-answer -answerConfig').sort('order').lean()
  },

  /** Teacher/admin-facing: includes the answer key for curriculum authoring/review. */
  async listActivitiesForTeacher(lessonId: string) {
    await this.getLesson(lessonId)
    return Activity.find({ lessonId, status: 'active' }).select('+answer +answerConfig').sort('order').lean()
  },

  async getActivity(id: string) {
    const activity = await Activity.findById(id).select('+answer +answerConfig')
    if (!activity) throw ApiError.notFound('Activity not found')
    return activity
  },

  async getActivityForStudent(id: string) {
    const activity = await Activity.findById(id).select('-answer -answerConfig').lean()
    if (!activity) throw ApiError.notFound('Activity not found')
    return activity
  },
}
