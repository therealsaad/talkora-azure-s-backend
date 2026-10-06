import {
  Student,
} from '../models/Student'

import {
  CurriculumClass,
} from '../models/CurriculumClass'

import {
  Level,
} from '../models/Level'

import {
  Lesson,
} from '../models/Lesson'

import {
  Activity,
} from '../models/Activity'

import {
  ApiError,
} from '../utils/ApiError'

export const CurriculumAccessService = {
  async context(
    studentId: string,
  ) {
    const student =
      await Student.findById(
        studentId,
      )
        .select(
          'grade schoolId status className fullName',
        )
        .lean()

    if (
      !student ||
      student.status !== 'active'
    ) {
      throw ApiError.unauthorized(
        'Student profile is unavailable',
      )
    }

    const curriculumClass =
      await CurriculumClass.findOne({
        grade:
          student.grade,

        status:
          'active',
      }).lean()

    if (!curriculumClass) {
      throw ApiError.notFound(
        `Published curriculum is not available for Class ${student.grade}`,
      )
    }

    return {
      student,
      curriculumClass,
    }
  },

  async assertClass(
    studentId: string,
    classId: string,
  ) {
    const context =
      await this.context(
        studentId,
      )

    if (
      context.curriculumClass._id.toString() !==
      classId
    ) {
      throw ApiError.curriculumAccess()
    }

    return context
  },

  async assertLevel(
    studentId: string,
    levelId: string,
  ) {
    const level =
      await Level.findById(
        levelId,
      ).lean()

    if (
      !level ||
      level.status !== 'active'
    ) {
      throw ApiError.activityUnavailable(
        'This unit is unavailable',
      )
    }

    if (
      level.availability !==
      'PUBLISHED'
    ) {
      throw ApiError.activityUnavailable(
        'This unit is not published',
      )
    }

    await this.assertClass(
      studentId,
      level.classId.toString(),
    )

    return level
  },

  async assertLesson(
    studentId: string,
    lessonId: string,
  ) {
    const lesson =
      await Lesson.findById(
        lessonId,
      ).lean()

    if (
      !lesson ||
      lesson.status !== 'active'
    ) {
      throw ApiError.activityUnavailable(
        'This lesson is not published',
      )
    }

    const level =
      await this.assertLevel(
        studentId,
        lesson.levelId.toString(),
      )

    return {
      lesson,
      level,
    }
  },

  async assertActivity(
    studentId: string,
    activityId: string,
  ) {
    const activity =
      await Activity.findById(
        activityId,
      ).lean()

    if (
      !activity ||
      activity.status !== 'active'
    ) {
      throw ApiError.activityUnavailable(
        'This activity is unavailable',
      )
    }

    const {
      lesson,
      level,
    } =
      await this.assertLesson(
        studentId,
        activity.lessonId.toString(),
      )

    return {
      activity,
      lesson,
      level,
    }
  },
}