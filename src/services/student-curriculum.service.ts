import {
  ProgressService,
} from './progress.service'

import {
  CurriculumAccessService,
} from './curriculum-access.service'

import {
  Level,
} from '../models/Level'

import {
  Lesson,
} from '../models/Lesson'

import {
  Activity,
} from '../models/Activity'

/* =========================================================
   STUDENT CURRICULUM SERVICE

   Student contract:

   JWT studentId
        ↓
   Student.grade
        ↓
   CurriculumClass
        ↓
   exactly that student's units
        ↓
   server-owned progress states

   The browser does NOT choose classId or grade.
   ========================================================= */

export const StudentCurriculumService = {
  /* =======================================================
     FULL STUDENT CURRICULUM
     ======================================================= */

  async get(
    studentId: string,
  ) {
    /* =====================================================
       AUTHORITATIVE STUDENT + GRADE
       ===================================================== */

    const {
      student,
      curriculumClass,
    } =
      await CurriculumAccessService.context(
        studentId,
      )

    /* =====================================================
       ENSURE PROGRESS EXISTS

       IMPORTANT:
       Do not use Progress.findOne() directly here.

       ProgressService owns:
       - initial Unit 1 unlock
       - published-level synchronization
       - curriculum version
       - grade security
       ===================================================== */

    const progress =
      await ProgressService.getForStudent(
        studentId,

        curriculumClass._id.toString(),
      )

    /* =====================================================
       EXACTLY THIS GRADE'S UNIT MAP
       ===================================================== */

    const units =
      await Level.find({
        classId:
          curriculumClass._id,

        status:
          'active',
      })
        .sort({
          order: 1,
        })
        .lean()

    /* =====================================================
       LESSONS
       ===================================================== */

    const unitIds =
      units.map(
        (unit) =>
          unit._id,
      )

    const lessons =
      unitIds.length >
      0
        ? await Lesson.find({
            levelId: {
              $in:
                unitIds,
            },

            status:
              'active',
          })
            .sort({
              levelId: 1,

              order: 1,
            })
            .lean()
        : []

    /* =====================================================
       ACTIVITIES
       ===================================================== */

    const lessonIds =
      lessons.map(
        (lesson) =>
          lesson._id,
      )

    const activities =
      lessonIds.length >
      0
        ? await Activity.find({
            lessonId: {
              $in:
                lessonIds,
            },

            status:
              'active',
          })
            /*
             * Student curriculum must never expose answer keys.
             */
            .select(
              '-answer -answerConfig',
            )
            .sort({
              lessonId:
                1,

              order:
                1,
            })
            .lean()
        : []

    /* =====================================================
       FAST LOOKUPS
       ===================================================== */

    const progressByUnit =
      new Map(
        progress.levels.map(
          (item) => [
            item.levelId.toString(),

            item,
          ],
        ),
      )

    const lessonsByUnit =
      new Map<
        string,
        typeof lessons
      >()

    for (
      const lesson
      of lessons
    ) {
      const key =
        lesson.levelId.toString()

      const collection =
        lessonsByUnit.get(
          key,
        ) ?? []

      collection.push(
        lesson,
      )

      lessonsByUnit.set(
        key,
        collection,
      )
    }

    const activitiesByLesson =
      new Map<
        string,
        typeof activities
      >()

    for (
      const activity
      of activities
    ) {
      const key =
        activity.lessonId.toString()

      const collection =
        activitiesByLesson.get(
          key,
        ) ?? []

      collection.push(
        activity,
      )

      activitiesByLesson.set(
        key,
        collection,
      )
    }

    /* =====================================================
       DETERMINE CURRENT UNIT

       Progress should normally have exactly one:
       unlocked / in-progress unit.

       If migrated data contains more than one, choose the
       earliest unit by authoritative curriculum order.
       ===================================================== */

    let currentUnitId:
      string | null =
      null

    for (
      const unit
      of units
    ) {
      if (
        unit.availability !==
        'PUBLISHED'
      ) {
        continue
      }

      const unitProgress =
        progressByUnit.get(
          unit._id.toString(),
        )

      if (
        !unitProgress
      ) {
        continue
      }

      if (
        unitProgress.status ===
          'unlocked' ||
        unitProgress.status ===
          'in-progress'
      ) {
        currentUnitId =
          unit._id.toString()

        break
      }
    }

    /* =====================================================
       MAP CONTRACT
       ===================================================== */

    const result =
      units.map(
        (unit) => {
          const unitId =
            unit._id.toString()

          const unitLessons =
            lessonsByUnit.get(
              unitId,
            ) ?? []

          const unitActivities =
            unitLessons.flatMap(
              (lesson) =>
                activitiesByLesson.get(
                  lesson._id.toString(),
                ) ?? [],
            )

          const unitProgress =
            progressByUnit.get(
              unitId,
            )

          /* ===============================================
             COMPLETED ACTIVITY IDS
             =============================================== */

          const completedIds =
            new Set(
              (
                unitProgress
                  ?.lessons ??
                []
              ).flatMap(
                (
                  lessonProgress,
                ) =>
                  lessonProgress
                    .completedActivityIds
                    .map(
                      (
                        activityId,
                      ) =>
                        activityId.toString(),
                    ),
              ),
            )

          /* ===============================================
             ONLY REQUIRED CORE ACTIVITIES CONTROL %
             =============================================== */

          const requiredActivities =
            unitActivities.filter(
              (activity) =>
                activity.required !==
                  false &&
                activity.core !==
                  false,
            )

          const completedRequired =
            requiredActivities.filter(
              (activity) =>
                completedIds.has(
                  activity._id.toString(),
                ),
            ).length

          const completionPercent =
            requiredActivities.length >
            0
              ? Math.round(
                  (
                    completedRequired /
                    requiredActivities.length
                  ) *
                    100,
                )
              : null

          /* ===============================================
             SERVER-OWNED UNIT STATUS
             =============================================== */

          let status:
            | 'CURRENT'
            | 'LOCKED'
            | 'COMPLETED'
            | 'UPCOMING'

          /*
           * Anything other than explicitly PUBLISHED
           * must not become playable.
           */
          if (
            unit.availability !==
            'PUBLISHED'
          ) {
            status =
              'UPCOMING'
          } else if (
            unitProgress?.status ===
            'completed'
          ) {
            status =
              'COMPLETED'
          } else if (
            currentUnitId ===
            unitId
          ) {
            status =
              'CURRENT'
          } else {
            status =
              'LOCKED'
          }

          /* ===============================================
             LESSON SUMMARY
             =============================================== */

          const lessonSummary =
            unitLessons.map(
              (lesson) => {
                const lessonProgress =
                  unitProgress
                    ?.lessons
                    .find(
                      (
                        item,
                      ) =>
                        item.lessonId.toString() ===
                        lesson._id.toString(),
                    )

                return {
                  id:
                    lesson._id.toString(),

                  order:
                    lesson.order,

                  title:
                    lesson.title,

                  subtitle:
                    lesson.subtitle,

                  estimatedMinutes:
                    lesson.estimatedMinutes,

                  xpReward:
                    lesson.xpReward,

                  completed:
                    Boolean(
                      lessonProgress
                        ?.completed,
                    ),
                }
              },
            )

          return {
            id:
              unitId,

            unitNumber:
              unit.unitNumber ??
              unit.number,

            /*
             * Curriculum title remains authoritative.
             */
            title:
              unit.title,

            /*
             * Product world label stays separate.
             */
            worldName:
              unit.place,

            term:
              unit.term,

            unitType:
              unit.unitType,

            curriculumVersion:
              unit.curriculumVersion,

            availability:
              unit.availability,

            status,

            progress:
              completionPercent,

            accuracy:
              unitProgress
                ?.accuracy ??
              0,

            totalTimeMs:
              unitProgress
                ?.totalTimeMs ??
              0,

            completedAt:
              unitProgress
                ?.completedAt ??
              null,

            unlockedAt:
              unitProgress
                ?.unlockedAt ??
              null,

            badge:
              unit.badge,

            learningObjectives:
              unit.learningObjectives ??
              [],

            speakingGoals:
              unit.speakingGoals ??
              [],

            lessonCount:
              unitLessons.length,

            lessons:
              lessonSummary,

            source: {
              pdf:
                unit.sourceBook,

              pages:
                unit.sourcePages ??
                [],
            },
          }
        },
      )

    /* =====================================================
       CURRENT UNIT
       ===================================================== */

    const currentUnit =
      result.find(
        (unit) =>
          unit.status ===
          'CURRENT',
      ) ?? null

    /* =====================================================
       RESPONSE

       classId may remain for internal API compatibility,
       but the UI must not treat it as a selector.
       ===================================================== */

    return {
      studentGrade:
        student.grade,

      classId:
        curriculumClass._id.toString(),

      className:
        curriculumClass.name,

      curriculumVersion:
        progress.curriculumVersion ??
        currentUnit
          ?.curriculumVersion ??
        result.find(
          (unit) =>
            unit.availability ===
            'PUBLISHED',
        )?.curriculumVersion ??
        null,

      xp:
        progress.xp,

      stars:
        progress.stars,

      streak:
        progress.streak,

      currentUnitId:
        currentUnit?.id ??
        null,

      completedUnits:
        result.filter(
          (unit) =>
            unit.status ===
            'COMPLETED',
        ).length,

      totalUnits:
        result.length,

      units:
        result,
    }
  },

  /* =======================================================
     CURRENT LEARNING POSITION
     ======================================================= */

  async current(
    studentId: string,
  ) {
    const curriculum =
      await this.get(
        studentId,
      )

    const currentUnit =
      curriculum.units.find(
        (unit) =>
          unit.status ===
          'CURRENT',
      ) ?? null

    if (
      !currentUnit
    ) {
      return {
        ...curriculum,

        currentUnit:
          null,

        currentLesson:
          null,

        currentStage:
          null,

        currentActivity:
          null,
      }
    }

    /* =====================================================
       ACCESS CHECK

       Even though get() already derived the unit from the
       student's class, keep the boundary explicit.
       ===================================================== */

    await CurriculumAccessService.assertLevel(
      studentId,

      currentUnit.id,
    )

    /* =====================================================
       LESSONS
       ===================================================== */

    const lessons =
      await Lesson.find({
        levelId:
          currentUnit.id,

        status:
          'active',
      })
        .sort({
          order: 1,
        })
        .lean()

    /* =====================================================
       ACTIVITIES
       ===================================================== */

    const lessonIds =
      lessons.map(
        (lesson) =>
          lesson._id,
      )

    const activities =
      lessonIds.length >
      0
        ? await Activity.find({
            lessonId: {
              $in:
                lessonIds,
            },

            status:
              'active',
          })
            .select(
              '-answer -answerConfig',
            )
            .sort({
              lessonId:
                1,

              order:
                1,
            })
            .lean()
        : []

    /* =====================================================
       PROGRESS

       Safe because StudentCurriculumService.get() already
       ensured progress exists.
       ===================================================== */

    const {
      curriculumClass,
    } =
      await CurriculumAccessService.context(
        studentId,
      )

    const progress =
      await ProgressService.getForStudent(
        studentId,

        curriculumClass._id.toString(),
      )

    const levelProgress =
      progress.levels.find(
        (item) =>
          item.levelId.toString() ===
          currentUnit.id,
      )

    const completed =
      new Set(
        (
          levelProgress
            ?.lessons ??
          []
        ).flatMap(
          (
            lessonProgress,
          ) =>
            lessonProgress
              .completedActivityIds
              .map(
                (
                  activityId,
                ) =>
                  activityId.toString(),
              ),
        ),
      )

    /* =====================================================
       FIND FIRST REQUIRED INCOMPLETE ACTIVITY

       Backend controls ordering.
       ===================================================== */

    const next =
      activities.find(
        (activity) =>
          activity.required !==
            false &&
          activity.core !==
            false &&
          !completed.has(
            activity._id.toString(),
          ),
      ) ?? null

    /* =====================================================
       CURRENT LESSON
       ===================================================== */

    const currentLesson =
      next
        ? lessons.find(
            (lesson) =>
              lesson._id.toString() ===
              next.lessonId.toString(),
          ) ?? null
        : null

    /* =====================================================
       NO REMAINING REQUIRED ACTIVITY

       This can temporarily happen between the final activity
       attempt and the completed-unit response.
       ===================================================== */

    if (!next) {
      return {
        ...curriculum,

        currentUnit,

        currentLesson:
          null,

        currentStage:
          null,

        currentActivity:
          null,
      }
    }

    /* =====================================================
       STUDENT-SAFE ACTIVITY CONTRACT
       ===================================================== */

    return {
      ...curriculum,

      currentUnit,

      currentLesson:
        currentLesson
          ? {
              id:
                currentLesson._id.toString(),

              order:
                currentLesson.order,

              title:
                currentLesson.title,

              subtitle:
                currentLesson.subtitle,

              teacherIntroduction:
                currentLesson.teacherIntroduction,

              estimatedMinutes:
                currentLesson.estimatedMinutes,

              xpReward:
                currentLesson.xpReward,
            }
          : null,

      currentStage:
        next.stage,

      currentActivity: {
        id:
          next._id.toString(),

        lessonId:
          next.lessonId.toString(),

        order:
          next.order,

        type:
          next.type,

        stage:
          next.stage,

        core:
          next.core,

        required:
          next.required,

        title:
          next.title,

        prompt:
          next.prompt,

        instruction:
          next.instruction,

        teacherPrompt:
          next.teacherPrompt ||
          next.prompt,

        modelSentence:
          next.modelSentence,

        target:
          next.target,

        choices:
          next.choices,

        expectedPatterns:
          next.expectedPatterns,

        keywords:
          next.keywords,

        difficulty:
          next.difficulty,

        xp:
          next.xp,

        estimatedSeconds:
          next.estimatedSeconds,

        allowMic:
          next.allowMic ||
          next.voiceEnabled,

        allowOptions:
          next.allowOptions,

        voiceEnabled:
          next.voiceEnabled,

        aiEnabled:
          next.aiEnabled,

        repeatRequired:
          next.repeatRequired,

        maxConversationTurns:
          next.maxConversationTurns,

        conversationGoal:
          next.conversationGoal,

        source:
          next.source,
      },
    }
  },
}
