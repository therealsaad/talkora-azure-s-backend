import mongoose, {
  Types,
} from 'mongoose'

import {
  Activity,
} from '../models/Activity'

import {
  Lesson,
} from '../models/Lesson'

import {
  Level,
} from '../models/Level'

import {
  Student,
} from '../models/Student'

import {
  CurriculumClass,
} from '../models/CurriculumClass'

import {
  ActivityAttempt,
} from '../models/ActivityAttempt'

import {
  Progress,
  IProgress,
  ILevelProgress,
} from '../models/Progress'

import {
  LearningEvent,
} from '../models/LearningEvent'

import {
  MistakeRecord,
} from '../models/MistakeRecord'

import {
  ApiError,
} from '../utils/ApiError'

import {
  AchievementService,
} from './achievement.service'

import {
  CurriculumAccessService,
} from './curriculum-access.service'

import {
  areRequiredActivitiesComplete,
} from './progress-completion'

/* =========================================================
   HELPERS
   ========================================================= */

function normalize(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      ' ',
    )
}

/* =========================================================
   SCORE
   ========================================================= */

/**
 * Deterministic backend-owned score.
 *
 * Frontend never supplies correctness.
 */
function computeScore(input: {
  correct: boolean

  attemptNumber: number

  timeTakenMs: number

  expectedSeconds: number

  hintsUsed: number
}): number {
  if (!input.correct) {
    return 0
  }

  let score =
    100

  /* =======================================================
     ATTEMPTS

     Small penalty only.
     ======================================================= */

  score -=
    Math.min(
      30,
      (
        input.attemptNumber -
        1
      ) *
        10,
    )

  /* =======================================================
     TIME

     Slow students must not be heavily punished.
     ======================================================= */

  const expectedMs =
    Math.max(
      1,
      input.expectedSeconds,
    ) *
    1000

  const overTimeRatio =
    input.timeTakenMs /
    expectedMs

  if (
    overTimeRatio >
    1.5
  ) {
    score -=
      Math.min(
        15,
        Math.round(
          (
            overTimeRatio -
            1.5
          ) *
            10,
        ),
      )
  }

  /* =======================================================
     HINTS
     ======================================================= */

  score -=
    Math.min(
      15,
      input.hintsUsed *
        5,
    )

  /*
   * Correct answer always keeps meaningful credit.
   */
  return Math.max(
    40,
    Math.round(
      score,
    ),
  )
}

/* =========================================================
   XP
   ========================================================= */

function xpForScore(
  baseXp: number,
  score: number,
): number {
  return Math.max(
    0,
    Math.round(
      baseXp *
        (
          score /
          100
        ),
    ),
  )
}

function computeDailyStreak(
  previousStreak: number,
  previousLastActivityAt?: Date | null,
  now = new Date(),
): number {
  if (!previousLastActivityAt) {
    return 1
  }

  const previousDate = new Date(previousLastActivityAt)
  const previousDay = new Date(previousDate.getFullYear(), previousDate.getMonth(), previousDate.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((today.getTime() - previousDay.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) {
    return Math.max(1, previousStreak)
  }

  if (diffDays === 1) {
    return previousStreak + 1
  }

  return 1
}

/* =========================================================
   STUDENT CLASS SECURITY
   ========================================================= */

/**
 * Resolve the student's real curriculum class.
 *
 * IMPORTANT:
 *
 * We do NOT trust classId from the client.
 *
 * Student:
 *   JWT studentId
 *       ↓
 *   Student.grade
 *       ↓
 *   CurriculumClass.grade
 *
 * This is the authoritative curriculum class.
 */
async function resolveStudentCurriculumClass(
  studentId: string,
) {
  const student =
    await Student.findById(
      studentId,
    )
      .select(
        'grade status',
      )
      .lean()

  if (
    !student ||
    student.status !==
      'active'
  ) {
    throw ApiError.notFound(
      'Student not found',
    )
  }

  const curriculumClass =
    await CurriculumClass.findOne(
      {
        grade:
          student.grade,

        status:
          'active',
      },
    )
      .lean()

  if (
    !curriculumClass
  ) {
    throw ApiError.businessRule(
      `Curriculum for Class ${student.grade} is not available yet.`,
    )
  }

  return {
    student,

    curriculumClass,
  }
}

/* =========================================================
   ASSERT CLASS OWNERSHIP
   ========================================================= */

async function assertStudentClass(
  studentId: string,
  requestedClassId: string,
) {
  const {
    curriculumClass,
  } =
    await resolveStudentCurriculumClass(
      studentId,
    )

  if (
    curriculumClass._id.toString() !==
    requestedClassId
  ) {
    throw ApiError.businessRule(
      'You cannot access another class curriculum.',
    )
  }

  return curriculumClass
}

/* =========================================================
   PROGRESS SERVICE
   ========================================================= */

export const ProgressService = {
  /* =======================================================
     ENSURE PROGRESS
     ======================================================= */

  /**
   * Ensures one Progress document exists for:
   *
   * student + their REAL curriculum class.
   *
   * Also synchronizes newly published levels into an
   * existing progress document without destroying history.
   */
  async ensureProgress(
    studentId: string,
    classId: string,
  ): Promise<
    mongoose.Document &
      IProgress
  > {
    /* =====================================================
       GRADE SECURITY
       ===================================================== */

    const curriculumClass =
      await assertStudentClass(
        studentId,
        classId,
      )

    /* =====================================================
       PUBLISHED LEVELS ONLY
       ===================================================== */

    const levels =
      await Level.find({
        classId:
          curriculumClass._id,

        status:
          'active',

        availability:
          'PUBLISHED',
      })
        .sort({
          order: 1,
        })
        .lean()

    if (
      levels.length ===
      0
    ) {
      throw ApiError.businessRule(
        'No published curriculum is available for this class.',
      )
    }

    /* =====================================================
       FIRST-TIME PROGRESS SHAPE
       ===================================================== */

    const initialLevels:
      ILevelProgress[] =
      levels.map(
        (
          level,
          index,
        ) => ({
          levelId:
            level._id,

          status:
            index === 0
              ? 'unlocked'
              : 'locked',

          lessons:
            [],

          accuracy:
            0,

          totalTimeMs:
            0,

          unlockedAt:
            index === 0
              ? new Date()
              : undefined,
        }),
      )

    const curriculumVersion =
      levels[0]
        ?.curriculumVersion ||
      'legacy'

    let progress:
      | (
          mongoose.Document &
          IProgress
        )
      | null =
      null

    try {
      progress =
        await Progress.findOneAndUpdate(
          {
            studentId,

            classId:
              curriculumClass._id,
          },

          {
            $setOnInsert: {
              studentId,

              classId:
                curriculumClass._id,

              curriculumVersion,

              levels:
                initialLevels,

              xp:
                0,

              stars:
                0,

              streak:
                0,
            },
          },

          {
            upsert:
              true,

            new:
              true,

            runValidators:
              true,
          },
        ) as
          | (
              mongoose.Document &
              IProgress
            )
          | null
    } catch (
      error
    ) {
      /*
       * Concurrent ensureProgress requests may race.
       */
      if (
        (
          error as {
            code?: number
          }
        ).code !==
        11000
      ) {
        throw error
      }

      progress =
        await Progress.findOne(
          {
            studentId,

            classId:
              curriculumClass._id,
          },
        )

      if (
        !progress
      ) {
        throw error
      }
    }

    if (
      !progress
    ) {
      throw new Error(
        'Progress could not be initialized',
      )
    }

    /* =====================================================
       SYNCHRONIZE PUBLISHED CURRICULUM

       Preserve:
       - XP
       - attempts
       - completed lessons
       - completed units
       - unlock dates

       Add only newly published levels.
       ===================================================== */

    let changed =
      false

    for (
      let index = 0;
      index <
      levels.length;
      index += 1
    ) {
      const level =
        levels[index]

      if (!level) {
        continue
      }

      const exists =
        progress.levels.some(
          (
            item,
          ) =>
            item.levelId.toString() ===
            level._id.toString(),
        )

      if (exists) {
        continue
      }

      /*
       * A newly published first level may be unlocked.
       *
       * Later newly published levels remain locked until
       * progression unlocks them.
       */
      const shouldUnlock =
        index ===
          0 &&
        progress.levels.length ===
          0

      progress.levels.push(
        {
          levelId:
            level._id,

          status:
            shouldUnlock
              ? 'unlocked'
              : 'locked',

          lessons:
            [],

          accuracy:
            0,

          totalTimeMs:
            0,

          unlockedAt:
            shouldUnlock
              ? new Date()
              : undefined,
        },
      )

      changed =
        true
    }

    const activeLessons = await Lesson.find({
      levelId: { $in: levels.map((level) => level._id) },
      status: 'active',
    })
      .select('_id levelId')
      .lean()
    const activeActivities = activeLessons.length
      ? await Activity.find({
          lessonId: { $in: activeLessons.map((lesson) => lesson._id) },
          status: 'active',
        })
          .select('_id lessonId required core')
          .lean()
      : []
    const activeIdsByLesson = new Map<string, Set<string>>()
    const requiredIdsByLesson = new Map<string, string[]>()
    const lessonsByLevel = new Map<string, typeof activeLessons>()

    for (const lesson of activeLessons) {
      const levelId = lesson.levelId.toString()
      const levelLessons = lessonsByLevel.get(levelId) || []
      levelLessons.push(lesson)
      lessonsByLevel.set(levelId, levelLessons)
    }

    for (const activity of activeActivities) {
      const lessonId = activity.lessonId.toString()
      const activityId = activity._id.toString()
      const activeIds = activeIdsByLesson.get(lessonId) || new Set<string>()
      activeIds.add(activityId)
      activeIdsByLesson.set(lessonId, activeIds)

      if (activity.required !== false && activity.core !== false) {
        const requiredIds = requiredIdsByLesson.get(lessonId) || []
        requiredIds.push(activityId)
        requiredIdsByLesson.set(lessonId, requiredIds)
      }
    }

    let previousLevelsComplete = true
    for (const level of levels) {
      const levelProgress = progress.levels.find(
        (item) => item.levelId.toString() === level._id.toString(),
      )
      if (!levelProgress) continue

      const levelLessons = lessonsByLevel.get(level._id.toString()) || []
      let levelComplete = levelLessons.length > 0

      for (const lesson of levelLessons) {
        const lessonId = lesson._id.toString()
        const lessonProgress = levelProgress.lessons.find(
          (item) => item.lessonId.toString() === lessonId,
        )
        const activeIds = activeIdsByLesson.get(lessonId) || new Set<string>()
        const requiredIds = requiredIdsByLesson.get(lessonId) || []
        const oldCompletedIds = lessonProgress?.completedActivityIds || []
        const seenActivityIds = new Set<string>()
        const prunedCompletedIds = oldCompletedIds.filter((id) => {
          const activityId = id.toString()
          if (!activeIds.has(activityId) || seenActivityIds.has(activityId)) {
            return false
          }
          seenActivityIds.add(activityId)
          return true
        })
        const prunedSet = new Set(prunedCompletedIds.map((id) => id.toString()))

        if (lessonProgress && prunedCompletedIds.length !== oldCompletedIds.length) {
          lessonProgress.completedActivityIds = prunedCompletedIds
          changed = true
        }

        const lessonComplete = areRequiredActivitiesComplete(requiredIds, prunedSet)
        if (lessonProgress && lessonProgress.completed !== lessonComplete) {
          lessonProgress.completed = lessonComplete
          changed = true
        }
        if (lessonProgress && lessonComplete && !lessonProgress.completedAt) {
          lessonProgress.completedAt = new Date()
          changed = true
        } else if (lessonProgress && !lessonComplete && lessonProgress.completedAt) {
          lessonProgress.completedAt = undefined
          changed = true
        }
        if (!lessonProgress || !lessonComplete) levelComplete = false
      }

      if (levelComplete) {
        if (levelProgress.status !== 'completed') {
          levelProgress.status = 'completed'
          changed = true
        }
        if (!levelProgress.completedAt) {
          levelProgress.completedAt = new Date()
          changed = true
        }
      } else {
        const nextStatus =
          previousLevelsComplete
            ? levelProgress.status === 'in-progress'
              ? 'in-progress'
              : 'unlocked'
            : 'locked'
        if (levelProgress.status !== nextStatus) {
          levelProgress.status = nextStatus
          changed = true
        }
        if (levelProgress.completedAt) {
          levelProgress.completedAt = undefined
          changed = true
        }
        if (nextStatus === 'unlocked' && !levelProgress.unlockedAt) {
          levelProgress.unlockedAt = new Date()
          changed = true
        }
      }

      previousLevelsComplete = previousLevelsComplete && levelComplete
    }

    /* =====================================================
       CURRICULUM VERSION
       ===================================================== */

    if (
      progress.curriculumVersion !==
      curriculumVersion
    ) {
      progress.curriculumVersion =
        curriculumVersion

      changed =
        true
    }

    if (changed) {
      await progress.save()
    }

    return progress
  },

  /* =======================================================
     STUDENT PROGRESS
     ======================================================= */

  async getForStudent(
    studentId: string,
    classId: string,
  ) {
    return this.ensureProgress(
      studentId,
      classId,
    )
  },

  /* =======================================================
     ASSERT LEVEL ACCESS
     ======================================================= */

  async assertLevelAccessible(
    studentId: string,
    classId: string,
    levelId: string,
  ) {
    /*
     * ensureProgress already guarantees grade/class access.
     */
    const progress =
      await this.ensureProgress(
        studentId,
        classId,
      )

    /* =====================================================
       LEVEL MUST BELONG TO THE SAME CLASS AND BE PUBLISHED
       ===================================================== */

    const level =
      await Level.findOne({
        _id:
          levelId,

        classId,

        status:
          'active',

        availability:
          'PUBLISHED',
      })
        .select(
          '_id',
        )
        .lean()

    if (!level) {
      throw ApiError.businessRule(
        'This unit is not available for your class.',
      )
    }

    const levelProgress =
      progress.levels.find(
        (
          item,
        ) =>
          item.levelId.toString() ===
          levelId,
      )

    if (
      !levelProgress ||
      levelProgress.status ===
        'locked'
    ) {
      throw ApiError.businessRule(
        'This unit is locked. Complete the previous unit first.',
      )
    }

    return progress
  },

  /* =======================================================
     SUBMIT ATTEMPT
     ======================================================= */

  /**
   * Processes one activity attempt:
   *
   * access
   * → evaluate
   * → persist idempotently
   * → progress
   * → events
   * → mistakes
   * → achievements
   */
  async submitAttempt(input: {
    studentId: string

    activityId: string

    answer: string

    startedAt: Date

    hintsUsed: number

    idempotencyKey?: string

    evaluation?: {
      score: number

      feedback?: string
    }
  }) {
    /* =====================================================
       ACTIVITY GRADE SECURITY
       ===================================================== */

    await CurriculumAccessService.assertActivity(
      input.studentId,
      input.activityId,
    )

    const activity =
      await Activity.findById(
        input.activityId,
      )
        .select(
          '+answer +answerConfig',
        )

    if (
      !activity ||
      activity.status !==
        'active'
    ) {
      throw ApiError.notFound(
        'Activity not found',
      )
    }

    const lesson =
      await Lesson.findById(
        activity.lessonId,
      )

    if (!lesson) {
      throw ApiError.notFound(
        'Lesson not found',
      )
    }

    const level =
      await Level.findById(
        lesson.levelId,
      )

    if (!level) {
      throw ApiError.notFound(
        'Level not found',
      )
    }

    /* =====================================================
       LEVEL LOCKING
       ===================================================== */

    await this.assertLevelAccessible(
      input.studentId,

      level.classId.toString(),

      level._id.toString(),
    )

    /* =====================================================
       IDEMPOTENCY
       ===================================================== */

    if (
      input.idempotencyKey
    ) {
      const existing =
        await ActivityAttempt.findOne(
          {
            studentId:
              input.studentId,

            idempotencyKey:
              input.idempotencyKey,
          },
        )

      if (existing) {
        const progress =
          await this.ensureProgress(
            input.studentId,

            level.classId.toString(),
          )

        return {
          attempt:
            existing,

          progress,

          alreadyProcessed:
            true,

          xpAwarded:
            0,

          score:
            existing.score,
        }
      }
    }

    /* =====================================================
       SAFE TIMING
       ===================================================== */

    const submittedAt =
      new Date()

    const timeTakenMs =
      Math.max(
        0,

        submittedAt.getTime() -
          input.startedAt.getTime(),
      )

    const MIN_PLAUSIBLE_MS =
      300

    const safeTimeTakenMs =
      Math.max(
        MIN_PLAUSIBLE_MS,

        timeTakenMs,
      )

    /* =====================================================
       ANSWER EVALUATION
       ===================================================== */

    const normalizedAnswer =
      normalize(
        input.answer,
      )

    const expectedAnswer =
      activity.answer
        ? normalize(
            activity.answer,
          )
        : undefined

    const acceptedAnswers =
      Array.isArray(activity.answerConfig?.acceptedAnswers)
        ? activity.answerConfig.acceptedAnswers
            .filter((answer): answer is string => typeof answer === 'string')
            .map((answer) => normalize(answer))
        : []

    const hasExternalEvaluation =
      Boolean(
        input.evaluation,
      )

    /*
     * AI / pronunciation/open-ended activities should arrive
     * with an evaluation score.
     *
     * Fixed-answer activities use backend answer data.
     */
    const correct =
      input.evaluation
        ? input.evaluation
            .score >= 70
        : (expectedAnswer !== undefined && normalizedAnswer === expectedAnswer) ||
          acceptedAnswers.includes(normalizedAnswer)

    /* =====================================================
       ATTEMPT NUMBER
       ===================================================== */

    const attemptNumber =
      (
        await ActivityAttempt.countDocuments(
          {
            studentId:
              input.studentId,

            activityId:
              activity._id,
          },
        )
      ) +
      1

    /* =====================================================
       SCORE
       ===================================================== */

    const score =
      hasExternalEvaluation &&
      input.evaluation
        ? Math.max(
            0,

            Math.min(
              100,

              Math.round(
                input.evaluation
                  .score,
              ),
            ),
          )
        : computeScore(
            {
              correct,

              attemptNumber,

              timeTakenMs:
                safeTimeTakenMs,

              expectedSeconds:
                activity.estimatedSeconds,

              hintsUsed:
                input.hintsUsed,
            },
          )

    /* =====================================================
       PERSIST ATTEMPT
       ===================================================== */

    let attempt

    try {
      attempt =
        await ActivityAttempt.create(
          {
            studentId:
              input.studentId,

            activityId:
              activity._id,

            lessonId:
              lesson._id,

            levelId:
              level._id,

            classId:
              level.classId,

            answer:
              input.answer,

            normalizedAnswer,

            correct,

            score,

            attemptNumber,

            startedAt:
              input.startedAt,

            submittedAt,

            timeTakenMs:
              safeTimeTakenMs,

            hintsUsed:
              input.hintsUsed,

            feedback:
              input.evaluation
                ?.feedback,

            idempotencyKey:
              input.idempotencyKey,
          },
        )
    } catch (
      error
    ) {
      if (
        typeof error ===
          'object' &&
        error !==
          null &&
        (
          error as {
            code?: number
          }
        ).code ===
          11000 &&
        input.idempotencyKey
      ) {
        const existing =
          await ActivityAttempt.findOne(
            {
              studentId:
                input.studentId,

              idempotencyKey:
                input.idempotencyKey,
            },
          )

        const progress =
          await this.ensureProgress(
            input.studentId,

            level.classId.toString(),
          )

        if (!existing) {
          throw error
        }

        return {
          attempt:
            existing,

          progress,

          alreadyProcessed:
            true,

          xpAwarded:
            0,

          score:
            existing.score,
        }
      }

      throw error
    }

    /* =====================================================
       XP
       ===================================================== */

    const xpAwarded =
      xpForScore(
        activity.xp,
        score,
      )

    /* =====================================================
       APPLY PROGRESS
       ===================================================== */

    const progress =
      await this._applyAttemptToProgress(
        {
          studentId:
            input.studentId,

          classId:
            level.classId.toString(),

          levelId:
            level._id.toString(),

          lessonId:
            lesson._id.toString(),

          activityId:
            activity._id.toString(),

          correct,

          score,

          timeTakenMs:
            safeTimeTakenMs,

          xpAwarded,
        },
      )

    /* =====================================================
       EVENT
       ===================================================== */

    await LearningEvent.create(
      {
        studentId:
          input.studentId,

        type:
          'activity_completed',

        lessonId:
          lesson._id,

        levelId:
          level._id,

        activityId:
          activity._id,

        metadata: {
          correct,

          score,

          xpAwarded,
        },
      },
    )

    /* =====================================================
       MISTAKES
       ===================================================== */

    if (
      !correct &&
      (
        expectedAnswer ||
        activity.target
      )
    ) {
      await MistakeRecord.findOneAndUpdate(
        {
          studentId:
            input.studentId,

          activityId:
            activity._id,
        },

        {
          $inc: {
            attemptCount:
              1,
          },

          $set: {
            lastOccurredAt:
              new Date(),

            expected:
              activity.answer ||
              activity.target ||
              '',

            actual:
              input.answer,

            type:
              activity.type,

            skill:
              `${lesson.title.toLowerCase()}:${activity.type.toLowerCase()}`,

            lessonId:
              lesson._id,

            resolved:
              false,
          },
        },

        {
          upsert:
            true,

          new:
            true,
        },
      )
    } else if (
      correct
    ) {
      await MistakeRecord.updateMany(
        {
          studentId:
            input.studentId,

          activityId:
            activity._id,
        },

        {
          resolved:
            true,
        },
      )
    }

    /* =====================================================
       ACHIEVEMENTS
       ===================================================== */

    await AchievementService.evaluateForStudent(
      input.studentId,
    )

    return {
      attempt,

      progress,

      alreadyProcessed:
        false,

      xpAwarded,

      score,
    }
  },

  /* =======================================================
     APPLY ATTEMPT
     ======================================================= */

  async _applyAttemptToProgress(
    input: {
      studentId: string

      classId: string

      levelId: string

      lessonId: string

      activityId: string

      correct: boolean

      score: number

      timeTakenMs: number

      xpAwarded: number
    },
  ) {
    const progress =
      await this.ensureProgress(
        input.studentId,
        input.classId,
      )

    /* =====================================================
       LEVEL PROGRESS
       ===================================================== */

    let levelProgress =
      progress.levels.find(
        (
          item,
        ) =>
          item.levelId.toString() ===
          input.levelId,
      )

    if (
      !levelProgress
    ) {
      /*
       * This should normally not happen because
       * ensureProgress syncs published levels.
       */
      progress.levels.push(
        {
          levelId:
            new Types.ObjectId(
              input.levelId,
            ),

          status:
            'unlocked',

          lessons:
            [],

          accuracy:
            0,

          totalTimeMs:
            0,

          unlockedAt:
            new Date(),
        },
      )

      levelProgress =
        progress.levels[
          progress.levels.length -
            1
        ]
    }

    if (
      !levelProgress
    ) {
      throw new Error(
        'Level progress could not be created',
      )
    }

    if (
      levelProgress.status ===
      'unlocked'
    ) {
      levelProgress.status =
        'in-progress'
    }

    /* =====================================================
       LESSON PROGRESS
       ===================================================== */

    let lessonProgress =
      levelProgress.lessons.find(
        (
          item,
        ) =>
          item.lessonId.toString() ===
          input.lessonId,
      )

    if (
      !lessonProgress
    ) {
      levelProgress.lessons.push(
        {
          lessonId:
            new Types.ObjectId(
              input.lessonId,
            ),

          completedActivityIds:
            [],

          completed:
            false,

          accuracy:
            0,

          totalTimeMs:
            0,
        },
      )

      lessonProgress =
        levelProgress.lessons[
          levelProgress.lessons.length -
            1
        ]
    }

    if (
      !lessonProgress
    ) {
      throw new Error(
        'Lesson progress could not be created',
      )
    }

    /* =====================================================
       COMPLETED ACTIVITY

       Only correct attempts count toward completion.
       ===================================================== */

    const activityObjectId =
      new Types.ObjectId(
        input.activityId,
      )

    const alreadyCompleted =
      lessonProgress.completedActivityIds.some(
        (
          id,
        ) =>
          id.equals(
            activityObjectId,
          ),
      )

    if (
      input.correct &&
      !alreadyCompleted
    ) {
      lessonProgress.completedActivityIds.push(
        activityObjectId,
      )
    }

    lessonProgress.totalTimeMs +=
      input.timeTakenMs

    /* =====================================================
       REQUIRED ACTIVITY COUNT

       Optional/home/enrichment activities must not block
       syllabus progression.
       ===================================================== */

    const requiredActivities =
      await Activity.find(
        {
          lessonId:
            input.lessonId,

          status:
            'active',

          required: {
            $ne:
              false,
          },

          core: {
            $ne:
              false,
          },
        },
      )
        .select('_id')
        .lean()
    const requiredActivityIds = requiredActivities.map((item) =>
      item._id.toString(),
    )
    const completedActivityIds = new Set(
      lessonProgress.completedActivityIds.map((id) => id.toString()),
    )

    const wasLessonComplete =
      lessonProgress.completed

    lessonProgress.completed = areRequiredActivitiesComplete(
      requiredActivityIds,
      completedActivityIds,
    )

    if (
      lessonProgress.completed &&
      !wasLessonComplete
    ) {
      lessonProgress.completedAt =
        new Date()

      await LearningEvent.create(
        {
          studentId:
            input.studentId,

          type:
            'lesson_completed',

          lessonId:
            input.lessonId,

          levelId:
            input.levelId,
        },
      )
    }

    /* =====================================================
       LESSON ACCURACY
       ===================================================== */

    const attempts =
      await ActivityAttempt.find(
        {
          studentId:
            input.studentId,

          lessonId:
            input.lessonId,
        },
      )
        .select(
          'correct',
        )
        .lean()

    if (
      attempts.length >
      0
    ) {
      const correctAttempts =
        attempts.filter(
          (
            attempt,
          ) =>
            attempt.correct,
        ).length

      lessonProgress.accuracy =
        Math.round(
          (
            correctAttempts /
            attempts.length
          ) *
            100,
        )
    }

    /* =====================================================
       LEVEL AGGREGATES
       ===================================================== */

    const totalLessonsInLevel =
      await Lesson.countDocuments(
        {
          levelId:
            input.levelId,

          status:
            'active',
        },
      )

    const completedLessons =
      levelProgress.lessons.filter(
        (
          item,
        ) =>
          item.completed,
      ).length

    levelProgress.totalTimeMs =
      levelProgress.lessons.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.totalTimeMs,
        0,
      )

    if (
      levelProgress.lessons.length >
      0
    ) {
      levelProgress.accuracy =
        Math.round(
          levelProgress.lessons.reduce(
            (
              total,
              item,
            ) =>
              total +
              item.accuracy,
            0,
          ) /
            levelProgress.lessons.length,
        )
    }

    /* =====================================================
       LEVEL COMPLETION
       ===================================================== */

    const wasLevelComplete =
      levelProgress.status ===
      'completed'

    if (
      totalLessonsInLevel >
        0 &&
      completedLessons >=
        totalLessonsInLevel
    ) {
      levelProgress.status =
        'completed'

      if (
        !levelProgress.completedAt
      ) {
        levelProgress.completedAt =
          new Date()
      }

      if (
        !wasLevelComplete
      ) {
        await LearningEvent.create(
          {
            studentId:
              input.studentId,

            type:
              'level_completed',

            levelId:
              input.levelId,
          },
        )

        await this._unlockNextLevel(
          progress,

          input.classId,

          input.levelId,
        )
      }
    }

    /* =====================================================
       XP IDEMPOTENCY

       If activity was already completed correctly before,
       don't award progression XP again.
       ===================================================== */

    if (
      !alreadyCompleted
    ) {
      progress.xp +=
        input.xpAwarded
    }

    /*
     * Keep existing stars policy for now so we don't change
     * the Progress model contract in the same step.
     */
    progress.stars =
      Math.floor(
        progress.xp /
        100,
      )

    const nextLastActivityAt = new Date()
    progress.streak = computeDailyStreak(
      progress.streak,
      progress.lastActivityAt,
      nextLastActivityAt,
    )
    progress.lastActivityAt = nextLastActivityAt

    await progress.save()

    return progress
  },

  /* =======================================================
     UNLOCK NEXT PUBLISHED LEVEL
     ======================================================= */

  async _unlockNextLevel(
    progress:
      mongoose.Document &
      IProgress,

    classId: string,

    completedLevelId:
      string,
  ) {
    /*
     * SECURITY:
     * never unlock UPCOMING curriculum.
     */
    const levels =
      await Level.find({
        classId,

        status:
          'active',

        availability:
          'PUBLISHED',
      })
        .sort({
          order: 1,
        })
        .lean()

    const index =
      levels.findIndex(
        (
          level,
        ) =>
          level._id.toString() ===
          completedLevelId,
      )

    if (
      index === -1
    ) {
      return
    }

    const nextLevel =
      levels[
        index +
          1
      ]

    /*
     * No next published level.
     *
     * Example:
     * Unit 4 complete while Unit 5 is UPCOMING.
     *
     * Unit 5 must remain unavailable.
     */
    if (
      !nextLevel
    ) {
      return
    }

    let nextProgress =
      progress.levels.find(
        (
          item,
        ) =>
          item.levelId.toString() ===
          nextLevel._id.toString(),
      )

    if (
      !nextProgress
    ) {
      progress.levels.push(
        {
          levelId:
            nextLevel._id,

          status:
            'unlocked',

          lessons:
            [],

          accuracy:
            0,

          totalTimeMs:
            0,

          unlockedAt:
            new Date(),
        },
      )

      return
    }

    if (
      nextProgress.status ===
      'locked'
    ) {
      nextProgress.status =
        'unlocked'

      nextProgress.unlockedAt =
        new Date()
    }
  },
}
