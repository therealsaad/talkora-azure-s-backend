import {
  connectDatabase,
  disconnectDatabase,
} from '../config/db'

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
  Student,
} from '../models/Student'

/* =========================================================
   TALKORA CURRICULUM VERIFICATION
   ========================================================= */

async function verifySeed() {
  await connectDatabase()

  console.log(
    '\n==========================================',
  )

  console.log(
    ' TALKORA CURRICULUM VERIFICATION',
  )

  console.log(
    '==========================================\n',
  )

  try {
    /* =====================================================
       CLASS 4
       ===================================================== */

    const class4 =
      await CurriculumClass.findOne({
        grade: 4,
      })

    if (!class4) {
      throw new Error(
        'Class 4 curriculum was not found.',
      )
    }

    console.log(
      '✅ Class 4 found:',
      class4.name,
    )

    /* =====================================================
       LEVELS
       ===================================================== */

    const levels =
      await Level.find({
        classId:
          class4._id,
      })
        .sort({
          number: 1,
        })
        .lean()

    console.log(
      '\n--- CLASS 4 UNITS ---',
    )

    console.log(
      `Total units: ${levels.length}`,
    )

    for (
      const level
      of levels
    ) {
      console.log(
        [
          `Unit ${level.number}`,

          level.title,

          `availability=${String(
            level.availability,
          )}`,

          `term=${String(
            level.term,
          )}`,
        ].join(
          ' | ',
        ),
      )
    }

    /* =====================================================
       EXPECT EXACTLY 8
       ===================================================== */

    if (
      levels.length !==
      8
    ) {
      console.error(
        `❌ Expected exactly 8 Class 4 units, found ${levels.length}`,
      )
    } else {
      console.log(
        '\n✅ Exactly 8 Class 4 units',
      )
    }

    /* =====================================================
       PUBLISHED / UPCOMING
       ===================================================== */

    const published =
      levels.filter(
        (level) =>
          level.availability ===
          'PUBLISHED',
      )

    const upcoming =
      levels.filter(
        (level) =>
          level.availability ===
          'UPCOMING',
      )

    console.log(
      `✅ Published units: ${published.length}`,
    )

    console.log(
      `✅ Upcoming units: ${upcoming.length}`,
    )

    if (
      published.length !==
      4
    ) {
      console.error(
        `❌ Expected 4 published units, found ${published.length}`,
      )
    }

    if (
      upcoming.length !==
      4
    ) {
      console.error(
        `❌ Expected 4 upcoming units, found ${upcoming.length}`,
      )
    }

    /* =====================================================
       UNIT 1
       ===================================================== */

    const unit1 =
      levels.find(
        (level) =>
          level.number ===
          1,
      )

    if (!unit1) {
      throw new Error(
        'Unit 1 was not found.',
      )
    }

    const unit1Lessons =
      await Lesson.find({
        levelId:
          unit1._id,
      })
        .sort({
          order: 1,
        })
        .lean()

    console.log(
      '\n--- UNIT 1 LESSONS ---',
    )

    console.log(
      `Lessons: ${unit1Lessons.length}`,
    )

    if (
      unit1Lessons.length ===
      0
    ) {
      throw new Error(
        'Unit 1 has no lesson.',
      )
    }

    for (
      const lesson
      of unit1Lessons
    ) {
      console.log(
        `Lesson ${lesson.order}: ${lesson.title}`,
      )
    }

    const unit1Lesson =
      unit1Lessons[0]

    if (!unit1Lesson) {
      throw new Error(
        'Unit 1 lesson could not be resolved.',
      )
    }

    /* =====================================================
       UNIT 1 ACTIVITIES
       ===================================================== */

    const activities =
      await Activity.find({
        lessonId:
          unit1Lesson._id,
      })
        .sort({
          order: 1,
        })
        .lean()

    console.log(
      '\n--- UNIT 1 ACTIVITIES ---',
    )

    console.log(
      `Total activities: ${activities.length}\n`,
    )

    for (
      const activity
      of activities
    ) {
      console.log(
        [
          `${String(
            activity.order,
          ).padStart(
            2,
            '0',
          )}.`,

          activity.stage,

          activity.type,

          activity.title,

          `mic=${activity.allowMic}`,

          `ai=${activity.aiEnabled}`,
        ].join(
          ' | ',
        ),
      )
    }

    if (
      activities.length !==
      10
    ) {
      console.error(
        `\n❌ Unit 1 should contain exactly 10 stages. Found ${activities.length}`,
      )
    } else {
      console.log(
        '\n✅ Unit 1 contains exactly 10 stages',
      )
    }

    /* =====================================================
       DUPLICATE ORDERS
       ===================================================== */

    const duplicateOrders =
      await Activity.aggregate([
        {
          $match: {
            lessonId:
              unit1Lesson._id,
          },
        },

        {
          $group: {
            _id:
              '$order',

            count: {
              $sum: 1,
            },
          },
        },

        {
          $match: {
            count: {
              $gt: 1,
            },
          },
        },
      ])

    if (
      duplicateOrders.length >
      0
    ) {
      console.error(
        '\n❌ Duplicate Unit 1 activity orders:',
        duplicateOrders,
      )
    } else {
      console.log(
        '✅ No duplicate Unit 1 activity orders',
      )
    }

    /* =====================================================
       CONVERSATIONS
       ===================================================== */

    const conversations =
      activities.filter(
        (activity) =>
          [
            'OPEN_CONVERSATION',

            'FOLLOW_UP_CONVERSATION',

            'FINAL_CONVERSATION',

            'ROLEPLAY',
          ].includes(
            activity.type,
          ),
      )

    console.log(
      '\n--- CONVERSATION ACTIVITIES ---',
    )

    for (
      const activity
      of conversations
    ) {
      console.log(
        [
          `#${activity.order}`,

          activity.type,

          activity.title,

          `minTurns=${String(
            activity
              .conversationGoal
              ?.minTurns ??
              '-',
          )}`,

          `maxTurns=${String(
            activity
              .conversationGoal
              ?.maxTurns ??
              activity.maxConversationTurns,
          )}`,
        ].join(
          ' | ',
        ),
      )
    }

    /* =====================================================
       CONVERSATION VALIDATION
       ===================================================== */

    const missingGoals =
      conversations.filter(
        (activity) =>
          !activity.conversationGoal,
      )

    if (
      missingGoals.length >
      0
    ) {
      console.error(
        '\n❌ Conversation activities missing conversationGoal:',
      )

      for (
        const activity
        of missingGoals
      ) {
        console.error(
          `   ${activity.order}: ${activity.title}`,
        )
      }
    } else {
      console.log(
        '\n✅ All conversation activities contain goals',
      )
    }

    /* =====================================================
       SOURCE PROVENANCE
       ===================================================== */

    const missingSources =
      activities.filter(
        (activity) =>
          !activity.source ||
          !activity.source.sourceType,
      )

    if (
      missingSources.length >
      0
    ) {
      console.error(
        '\n❌ Activities missing source provenance:',
      )

      for (
        const activity
        of missingSources
      ) {
        console.error(
          `   ${activity.order}: ${activity.title}`,
        )
      }
    } else {
      console.log(
        '✅ Every Unit 1 activity has source provenance',
      )
    }

    /* =====================================================
       VERSIONING
       ===================================================== */

    const versions =
      Array.from(
        new Set(
          activities.map(
            (activity) =>
              activity.curriculumVersion,
          ),
        ),
      )

    console.log(
      '\nCurriculum versions:',
      versions,
    )

    /* =====================================================
       STUDENTS
       ===================================================== */

    const students =
      await Student.find({
        status:
          'active',
      })
        .select(
          'fullName grade className avatarType',
        )
        .sort({
          grade: 1,
          fullName: 1,
        })
        .lean()

    console.log(
      '\n--- STUDENTS ---',
    )

    for (
      const student
      of students
    ) {
      console.log(
        [
          student.fullName,

          `Class ${student.grade}`,

          student.className,

          student.avatarType,
        ].join(
          ' | ',
        ),
      )
    }

    /* =====================================================
       GRADE COUNTS
       ===================================================== */

    const gradeCounts =
      students.reduce<
        Record<
          number,
          number
        >
      >(
        (
          result,
          student,
        ) => {
          result[
            student.grade
          ] =
            (
              result[
                student.grade
              ] ||
              0
            ) +
            1

          return result
        },
        {},
      )

    console.log(
      '\nStudent counts by grade:',
      gradeCounts,
    )

    /* =====================================================
       FINAL
       ===================================================== */

    console.log(
      '\n==========================================',
    )

    console.log(
      ' VERIFICATION FINISHED',
    )

    console.log(
      '==========================================\n',
    )
  } finally {
    await disconnectDatabase()
  }
}

verifySeed().catch(
  async (
    error,
  ) => {
    console.error(
      '\n❌ VERIFY FAILED:',
      error instanceof Error
        ? error.message
        : error,
    )

    try {
      await disconnectDatabase()
    } catch {
      // Ignore disconnect cleanup failure.
    }

    process.exit(1)
  },
)