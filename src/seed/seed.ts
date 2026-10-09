import {
  connectDatabase,
  disconnectDatabase,
} from '../config/db'
import { env } from '../config/env'
import { logger } from '../utils/logger'
import { hashPassword } from '../utils/password'
import { generateCode } from '../utils/idGenerator'

import { School } from '../models/School'
import { Teacher } from '../models/Teacher'
import { Student } from '../models/Student'
import { CurriculumClass } from '../models/CurriculumClass'
import { Level } from '../models/Level'
import { Lesson } from '../models/Lesson'
import { Activity } from '../models/Activity'
import { Achievement } from '../models/Achievement'
import { Progress } from '../models/Progress'

import {
  unit1FavouriteThingsActivities,
} from './data/unit1FavouriteThings'

import {
  unit2PartnerActivities,
  unit3OrderActivities,
  unit4CalendarActivities,
} from './data/term1Units'

/* =========================================================
   TALKORA CURRICULUM
   ========================================================= */

const SOURCE_BOOK =
  'Talkora syllabus,1.pdf'

const CURRICULUM_VERSION =
  'class4-term1-v1'

/* =========================================================
   8 AUTHORITATIVE TALKORA UNITS
   ========================================================= */

const LEVEL_TEMPLATE = [
  {
    term: 1,

    title:
      'My Favourite Things',

    type:
      'CONVERSATION',

    place:
      'Favourite Fair',

    description:
      'Ask, answer and continue conversations about favourite things.',
  },

  {
    term: 1,

    title:
      'All About My Partner',

    type:
      'PRESENTATION',

    place:
      'Friendship Garden',

    description:
      'Interview a partner, create a poster and give a clear presentation.',
  },

  {
    term: 1,

    title:
      "Let's Order",

    type:
      'CONVERSATION',

    place:
      'Talkora Café',

    description:
      'Describe food and practise a complete, polite restaurant conversation.',
  },

  {
    term: 1,

    title:
      'On My Calendar',

    type:
      'CONVERSATION',

    place:
      'Calendar Town',

    description:
      'Speak about the past, daily routines and future plans.',
  },

  {
    term: 2,

    title:
      'Let Me Help You',

    type:
      'CONVERSATION',

    place:
      'Helper HQ',

    description:
      'Upcoming syllabus unit.',
  },

  {
    term: 2,

    title:
      'Familiar Folk Tales',

    type:
      'PRESENTATION',

    place:
      'Story Forest',

    description:
      'Upcoming syllabus unit.',
  },

  {
    term: 2,

    title:
      'My Special Moment',

    type:
      'PRESENTATION',

    place:
      'Memory Stage',

    description:
      'Upcoming syllabus unit.',
  },

  {
    term: 2,

    title:
      'Using Our Voices for Good',

    type:
      'PRESENTATION',

    place:
      'Community Stage',

    description:
      'Upcoming syllabus unit.',
  },
] as const

/* =========================================================
   VERIFIED TERM 1 SOURCE RANGES
   ========================================================= */

const SOURCE_PAGE_RANGES = [
  [11, 26],
  [27, 42],
  [43, 60],
  [61, 77],
] as const

/* =========================================================
   UNIT 1 OBJECTIVES
   ========================================================= */

const UNIT_ONE_OBJECTIVES = [
  'Ask questions about favourite things',

  'Answer using full sentences',

  'Ask follow-up questions',

  'Learn more about another person',

  'Use polite language when favourites are different',

  'Speak clearly',

  'Maintain appropriate eye contact',

  'Communicate confidently',
]

const UNIT_TWO_OBJECTIVES = [
  'Ask a partner questions about their name, age, favourite food, after-school activity, hobby and best friend',
  'Listen carefully and check recorded details with a follow-up question',
  'Organise verified partner information into clear full-sentence poster lines',
  'Introduce a partner to a group in an organised presentation',
  'Use he or she correctly when sharing partner details',
  'Stand straight, make eye contact and speak clearly and confidently',
]

/* =========================================================
   TERM 1 AUTHORED CURRICULUM

   IMPORTANT:
   Only Units 1–4 currently have authored activity data.
   Units 5–8 stay upcoming until their content is authored.
   ========================================================= */

const TERM_ONE_CONFIG = [
  {
    activities:
      unit1FavouriteThingsActivities,

    badge: [
      'favourite-finder',
      'Favourite Finder',
      'Complete My Favourite Things with brave, polite speaking.',
    ] as const,

    intro:
      'Welcome to Favourite Fair! Let us discover favourite things and learn how good conversations keep going.',

    subtitle:
      'Ask, answer, follow up and respect different favourites.',
  },

  {
    activities:
      unit2PartnerActivities,

    badge: [
      'partner-presenter',
      'Partner Presenter',
      'Complete an interview, poster and partner presentation.',
    ] as const,

    intro:
      'Welcome to Friendship Garden! Interview a partner, make a poster and present with confidence.',

    subtitle:
      'Interview, organise information and present a partner clearly.',
  },

  {
    activities:
      unit3OrderActivities,

    badge: [
      'menu-master',
      'Menu Master',
      'Complete the Talkora Café roleplay politely.',
    ] as const,

    intro:
      'Welcome to Talkora Café! Let us describe food and practise ordering politely.',

    subtitle:
      'Describe food and complete a polite restaurant roleplay.',
  },

  {
    activities:
      unit4CalendarActivities,

    badge: [
      'calendar-communicator',
      'Calendar Communicator',
      'Speak clearly about past, routine and future.',
    ] as const,

    intro:
      'Welcome to Calendar Town! We will travel through yesterday, every day and tomorrow.',

    subtitle:
      'Connect past events, daily routines and future plans.',
  },
] as const

/* =========================================================
   ACHIEVEMENTS
   ========================================================= */

const ACHIEVEMENTS = [
  {
    key:
      'first-quest',

    title:
      'First Quest',

    description:
      'Complete your first activity.',

    category:
      'completion',

    criteria: {
      type:
        'activities_completed',

      count: 1,
    },
  },

  {
    key:
      'brave-speaker',

    title:
      'Brave Speaker',

    description:
      'Try a speaking activity.',

    category:
      'speaking',

    criteria: {
      type:
        'speaking_attempts',

      count: 1,
    },
  },

  {
    key:
      'word-explorer',

    title:
      'Word Explorer',

    description:
      'Complete 10 activities correctly.',

    category:
      'learning',

    criteria: {
      type:
        'activities_completed',

      count: 10,
    },
  },

  {
    key:
      'perfect-lesson',

    title:
      'Perfect Lesson',

    description:
      'Finish a lesson with 100% accuracy.',

    category:
      'completion',

    criteria: {
      type:
        'perfect_lesson',
    },
  },

  {
    key:
      'seven-day-streak',

    title:
      '7 Day Streak',

    description:
      'Practice for seven days in a row.',

    category:
      'streak',

    criteria: {
      type:
        'streak',

      days: 7,
    },
  },

  {
    key:
      'speaking-star',

    title:
      'Speaking Star',

    description:
      'Complete 5 speaking activities.',

    category:
      'speaking',

    criteria: {
      type:
        'speaking_attempts',

      count: 5,
    },
  },

  {
    key:
      'writing-star',

    title:
      'Writing Star',

    description:
      'Complete 10 spelling/sentence activities.',

    category:
      'learning',

    criteria: {
      type:
        'activities_completed',

      count: 20,
    },
  },

  {
    key:
      'pronunciation-hero',

    title:
      'Pronunciation Hero',

    description:
      'Complete a level.',

    category:
      'completion',

    criteria: {
      type:
        'levels_completed',

      count: 1,
    },
  },
]

/* =========================================================
   MAIN SEED
   ========================================================= */

async function seed() {
  await connectDatabase()

  logger.info(
    'Seeding Talkora database...',
  )

  try {
    /* =====================================================
       SCHOOL
       ===================================================== */

    const schoolPasswordHash =
      await hashPassword(
        env.seed.schoolPassword,
      )

    const school =
      await School.findOneAndUpdate(
        {
          code:
            env.seed.schoolCode,
        },

        {
          name:
            'Sunrise Public School',

          code:
            env.seed.schoolCode,

          location:
            'Pune, Maharashtra',

          passwordHash:
            schoolPasswordHash,

          status:
            'active',
        },

        {
          upsert: true,
          new: true,
        },
      )

    /* =====================================================
       TEACHER
       ===================================================== */

    const teacherPasswordHash =
      await hashPassword(
        env.seed.teacherPassword,
      )

    const teacher =
      await Teacher.findOneAndUpdate(
        {
          schoolId:
            school._id,

          email:
            env.seed.teacherEmail,
        },

        {
          schoolId:
            school._id,

          name:
            'Ananya Sharma',

          email:
            env.seed.teacherEmail,

          passwordHash:
            teacherPasswordHash,

          role:
            'TEACHER',

          status:
            'active',
        },

        {
          upsert: true,
          new: true,
        },
      )

    /* =====================================================
       CLASSES 4–10
       ===================================================== */

    for (
      let grade = 4;
      grade <= 10;
      grade += 1
    ) {
      const curriculumClass =
        await CurriculumClass.findOneAndUpdate(
          {
            grade,
          },

          {
            grade,

            name:
              `Class ${grade}`,

            order:
              grade - 3,

            /*
             * Only Class 4 currently has authored
             * production curriculum.
             */
            status:
              grade === 4
                ? 'active'
                : 'draft',
          },

          {
            upsert: true,
            new: true,
          },
        )

      /* ===================================================
         EXACTLY 8 UNIT MAP NODES
         =================================================== */

      for (
        let i = 0;
        i <
        LEVEL_TEMPLATE.length;
        i += 1
      ) {
        /*
         * `!` is intentional here.
         *
         * The loop boundary guarantees i is within the
         * tuple, but TypeScript's noUncheckedIndexedAccess
         * cannot prove it automatically.
         */
        const tpl =
          LEVEL_TEMPLATE[i]!

        const unitNumber =
          i + 1

        const isClass4 =
          grade === 4

        /*
         * Units 1–4 have authored Term-1 curriculum.
         *
         * Explicit boolean avoids all
         * "termOneConfig possibly undefined" problems.
         */
        const hasAuthoredContent =
          isClass4 &&
          i <
            TERM_ONE_CONFIG.length
        const unitTwoCurriculumVersion = 'class4-unit2-partner-v3'
        const existingLevel =
          isClass4 && unitNumber === 2
            ? await Level.findOne({
                classId: curriculumClass._id,
                number: unitNumber,
              })
                .select('curriculumVersion')
                .lean()
            : null
        const resetUnitTwoProgress =
          unitNumber === 2 &&
          Boolean(
            existingLevel &&
            existingLevel.curriculumVersion !== unitTwoCurriculumVersion,
          )

        /*
         * We do NOT access TERM_ONE_CONFIG[i] yet.
         * That prevents undefined narrowing issues.
         */

        let badge:
          | {
              key: string
              title: string
              description: string
            }
          | undefined

        let learningObjectives:
          string[] = []

        let speakingGoals:
          string[] = []

        let sourcePages:
          number[] = []

        if (
          hasAuthoredContent
        ) {
          /*
           * Bounds were explicitly checked above.
           */
          const config =
            TERM_ONE_CONFIG[i]!

          const pageRange =
            SOURCE_PAGE_RANGES[i]!

          badge = {
            key:
              config.badge[0],

            title:
              config.badge[1],

            description:
              config.badge[2],
          }

          learningObjectives =
            i === 0
              ? [...UNIT_ONE_OBJECTIVES]
              : i === 1
                ? [...UNIT_TWO_OBJECTIVES]
                : [tpl.description]

          speakingGoals = [
            'Speak clearly in full sentences',

            'Listen and respond appropriately',

            'Use confident, polite English',
          ]

          sourcePages =
            Array.from(
              {
                length:
                  pageRange[1] -
                  pageRange[0] +
                  1,
              },

              (
                _,
                offset,
              ) =>
                pageRange[0] +
                offset,
            )
        }

        /* =================================================
           LEVEL
           ================================================= */

        const level =
          await Level.findOneAndUpdate(
            {
              classId:
                curriculumClass._id,

              number:
                unitNumber,
            },

            {
              classId:
                curriculumClass._id,

              number:
                unitNumber,

              unitNumber,

              term:
                tpl.term,

              unitType:
                tpl.type,

              visualTheme:
                tpl.place,

              order:
                unitNumber,

              title:
                tpl.title,

              place:
                tpl.place,

              description:
                tpl.description,

              learningObjectives,

              speakingGoals,

              badge,

              sourceBook:
                hasAuthoredContent
                  ? SOURCE_BOOK
                  : undefined,

              sourcePages,

              curriculumVersion:
                !isClass4
                  ? `class${grade}-unpublished`
                  : unitNumber === 2
                    ? resetUnitTwoProgress
                      ? existingLevel?.curriculumVersion || CURRICULUM_VERSION
                      : unitTwoCurriculumVersion
                    : CURRICULUM_VERSION,

              availability:
                hasAuthoredContent
                  ? 'PUBLISHED'
                  : 'UPCOMING',

              status:
                isClass4
                  ? 'active'
                  : 'draft',
            },

            {
              upsert: true,
              new: true,
            },
          )

        /* =================================================
           CLASSES 5–10

           Their level shells may exist, but we never copy
           the Class 4 syllabus into them.
           ================================================= */

        if (!isClass4) {
          continue
        }

        /* =================================================
           UNITS 5–8

           Upcoming only.
           Remove any fake lessons/activities left by old
           seed generations.
           ================================================= */

        if (
          !hasAuthoredContent
        ) {
          const obsoleteLessons =
            await Lesson.find({
              levelId:
                level._id,
            })
              .select('_id')
              .lean()

          if (
            obsoleteLessons.length >
            0
          ) {
            const obsoleteLessonIds =
              obsoleteLessons.map(
                (
                  item,
                ) =>
                  item._id,
              )

            await Activity.deleteMany({
              lessonId: {
                $in:
                  obsoleteLessonIds,
              },
            })

            await Lesson.deleteMany({
              levelId:
                level._id,
            })
          }

          continue
        }

        /* =================================================
           FROM THIS POINT:
           i IS GUARANTEED TO REPRESENT UNIT 1–4.

           Non-null assertions are safe because the bound
           has been explicitly checked.
           ================================================= */

        const termOneConfig =
          TERM_ONE_CONFIG[i]!

        const pageRange =
          SOURCE_PAGE_RANGES[i]!

        /* =================================================
           LESSON
           ================================================= */

        const lesson =
          await Lesson.findOneAndUpdate(
            {
              levelId:
                level._id,

              order: 1,
            },

            {
              levelId:
                level._id,

              order: 1,

              title:
                tpl.title,

              subtitle:
                termOneConfig.subtitle,

              teacherIntroduction:
                termOneConfig.intro,

              estimatedMinutes:
                35,

              xpReward:
                230,

              settings: {
                autoPlayIntroduction:
                  true,

                voice:
                  'Priya',

                voiceStyleVersion:
                  'talkora-priya-v6-indian-kids-teacher',

                stageOrder: [
                  'WARM_UP',

                  'LISTEN_REPEAT',

                  'SPEAK',

                  'INTERACT',

                  'FOLLOW_UP',

                  'REASONS',

                  'RESPECT_DIFFERENCES',

                  'PRACTICE_ZONE',

                  'PRESENT',

                  'ROLEPLAY',

                  'FINAL_CHALLENGE',

                  'FINAL_TALK',

                  'REWARD',
                ],

                /*
                 * Unit 1-specific home practice for now.
                 * Other authored units can later move their
                 * own value into their curriculum file.
                 */
                homePractice:
                  i === 0
                    ? [
                        'Ask a family member about one favourite thing and one reason.',
                      ]
                    : [],

                sourceBook:
                  SOURCE_BOOK,

                sourcePages:
                  Array.from(
                    {
                      length:
                        pageRange[1] -
                        pageRange[0] +
                        1,
                    },

                    (
                      _,
                      offset,
                    ) =>
                      pageRange[0] +
                      offset,
                  ),
              },

              status:
                'active',
            },

            {
              upsert: true,
              new: true,
            },
          )

        /* =================================================
           ACTIVITIES
           ================================================= */

        const activitiesToSeed =
          termOneConfig.activities

        const activeActivityKeys =
          activitiesToSeed.map(
            (activity) =>
              activity.activityKey ||
              `class4-unit${unitNumber}-activity${activity.order}`,
          )

        if (unitNumber === 1) {
          const retiredUnitOneRows = await Activity.find({
            lessonId: lesson._id,
            order: { $gt: 0 },
            activityKey: { $nin: activeActivityKeys },
          }).select('_id order').lean()

          for (let index = 0; index < retiredUnitOneRows.length; index += 1) {
            await Activity.updateOne(
              { _id: retiredUnitOneRows[index]!._id },
              { $set: { order: -(600_000 + index), status: 'archived', 'metadata.archivedBy': 'class4-unit1-favourites-v4' } },
            )
          }
        } else if (unitNumber === 2) {
          const retiredUnitTwoRows = await Activity.find({
            lessonId: lesson._id,
            order: { $gt: 0 },
            activityKey: { $nin: activeActivityKeys },
          }).select('_id order').lean()

          for (let index = 0; index < retiredUnitTwoRows.length; index += 1) {
            await Activity.updateOne(
              { _id: retiredUnitTwoRows[index]!._id },
              { $set: { order: -(700_000 + index), status: 'archived', 'metadata.archivedBy': 'class4-unit2-partner-v3' } },
            )
          }
        }

        for (
          const activityInput
          of activitiesToSeed
        ) {
          /*
           * IMPORTANT:
           *
           * activityInput is authoritative.
           *
           * We DO NOT rewrite:
           *
           * stage
           * type
           * required
           * allowMic
           * allowOptions
           * repeatRequired
           * conversationGoal
           * maxConversationTurns
           * source
           *
           * That behaviour belongs in:
           *
           * unit1FavouriteThings.ts
           * term1Units.ts
           */

          const activityKey =
            activityInput.activityKey ||
            `class4-unit${unitNumber}-activity${activityInput.order}`

          const identity = unitNumber === 1
            ? { lessonId: lesson._id, activityKey }
            : { lessonId: lesson._id, order: activityInput.order }

          await Activity.findOneAndUpdate(
            identity,

            {
              /*
               * DB ownership fields.
               */
              lessonId:
                lesson._id,

              activityKey,

              curriculumVersion:
                unitNumber === 2 &&
                activityKey.startsWith('class4-unit2-partner-v3-')
                  ? unitTwoCurriculumVersion
                  : CURRICULUM_VERSION,

              status:
                'active',

              /*
               * AUTHORED ACTIVITY IS THE SOURCE OF TRUTH.
               */
              ...activityInput,
            },

            {
              upsert: true,

              new: true,

              runValidators:
                true,

              setDefaultsOnInsert:
                true,
            },
          )
        }

        await Activity.updateMany(
          {
            lessonId: lesson._id,
            status: 'active',
            activityKey: { $nin: activeActivityKeys },
          },
          {
            $set: { status: 'archived' },
          },
        )

        /* =================================================
           PRESERVE OBSOLETE ACTIVITIES

           Retired rows stay archived so ActivityAttempt and
           Progress references remain valid for existing learners.
           ================================================= */

        const activeOrders =
          activitiesToSeed.map(
            (
              activity,
            ) =>
              activity.order,
          )

        await Activity.updateMany(
          {
            lessonId: lesson._id,
            status: 'archived',
            order: { $nin: activeOrders },
          },
          {
            $set: { 'metadata.archivedBy': 'curriculum-seed' },
          },
        )

        if (resetUnitTwoProgress) {
          const laterLevelIds = new Set(
            (
              await Level.find({
                classId: curriculumClass._id,
                order: { $gt: level.order },
              })
                .select('_id')
                .lean()
            ).map((item) => item._id.toString()),
          )
          const studentProgress = await Progress.find({
            classId: curriculumClass._id,
            'levels.levelId': level._id,
          })

          for (const progress of studentProgress) {
            const unitProgress = progress.levels.find(
              (item) => item.levelId.equals(level._id),
            )
            if (!unitProgress) continue

            const lessonProgress = unitProgress.lessons.find(
              (item) => item.lessonId.equals(lesson._id),
            )
            if (lessonProgress) {
              lessonProgress.completedActivityIds = []
              lessonProgress.completed = false
              lessonProgress.completedAt = undefined
            }

            unitProgress.status = 'unlocked'
            unitProgress.completedAt = undefined

            for (const laterLevel of progress.levels) {
              if (laterLevelIds.has(laterLevel.levelId.toString())) {
                laterLevel.status = 'locked'
                laterLevel.completedAt = undefined
              }
            }

            await progress.save()
          }

          await Level.updateOne(
            { _id: level._id },
            { $set: { curriculumVersion: unitTwoCurriculumVersion } },
          )
        }
      }

      /* ===================================================
         OLD MAP CLEANUP

         Talkora = exactly 8 units.
         =================================================== */

      await Level.deleteMany({
        classId:
          curriculumClass._id,

        number: {
          $gt: 8,
        },
      })
    }

    /* =====================================================
       ACHIEVEMENT CATALOG
       ===================================================== */

    for (
      const achievement
      of ACHIEVEMENTS
    ) {
      await Achievement.findOneAndUpdate(
        {
          key:
            achievement.key,
        },

        achievement,

        {
          upsert: true,
        },
      )
    }

    /* =====================================================
       UNIT BADGES
       ===================================================== */

    await Achievement.findOneAndUpdate(
      {
        key:
          'favourite-finder',
      },

      {
        key:
          'favourite-finder',

        title:
          'Favourite Finder',

        description:
          'Complete My Favourite Things.',

        category:
          'completion',

        criteria: {
          type:
            'levels_completed',

          count: 1,
        },
      },

      {
        upsert: true,
      },
    )

    const curriculumAchievements = [
      {
        key:
          'partner-presenter',

        title:
          'Partner Presenter',

        description:
          'Complete All About My Partner.',

        count: 2,
      },

      {
        key:
          'menu-master',

        title:
          'Menu Master',

        description:
          "Complete Let's Order.",

        count: 3,
      },

      {
        key:
          'calendar-communicator',

        title:
          'Calendar Communicator',

        description:
          'Complete On My Calendar.',

        count: 4,
      },
    ] as const

    for (
      const achievement
      of curriculumAchievements
    ) {
      await Achievement.findOneAndUpdate(
        {
          key:
            achievement.key,
        },

        {
          key:
            achievement.key,

          title:
            achievement.title,

          description:
            achievement.description,

          category:
            'completion',

          criteria: {
            type:
              'levels_completed',

            count:
              achievement.count,
          },
        },

        {
          upsert: true,
        },
      )
    }

    /* =====================================================
       DEMO STUDENTS
       ===================================================== */

    const demoStudents = [
      {
        fullName:
          'Aanya Kapoor',

        rollNumber:
          '04',

        grade: 4,

        className:
          '4A',

        avatarType:
          'GIRL' as const,
      },

      {
        fullName:
          'Vihaan Mehta',

        rollNumber:
          '07',

        grade: 4,

        className:
          '4A',

        avatarType:
          'BOY' as const,
      },

      {
        fullName:
          'Zoya Khan',

        rollNumber:
          '12',

        grade: 4,

        className:
          '4B',

        avatarType:
          'GIRL' as const,
      },

      {
        fullName:
          'Arjun Rao',

        rollNumber:
          '18',

        grade: 4,

        className:
          '4A',

        avatarType:
          'BOY' as const,
      },

      {
        fullName:
          'Ishaan Verma',

        rollNumber:
          '02',

        grade: 5,

        className:
          '5A',

        avatarType:
          'BOY' as const,
      },

      {
        fullName:
          'Diya Nair',

        rollNumber:
          '09',

        grade: 5,

        className:
          '5A',

        avatarType:
          'GIRL' as const,
      },

      {
        fullName:
          'Kabir Singh',

        rollNumber:
          '15',

        grade: 6,

        className:
          '6A',

        avatarType:
          'BOY' as const,
      },

      {
        fullName:
          'Myra Joshi',

        rollNumber:
          '21',

        grade: 6,

        className:
          '6B',

        avatarType:
          'GIRL' as const,
      },
    ]

    const createdStudents:
      Array<{
        fullName:
          string

        studentCode:
          string
      }> = []

    for (
      const studentInput
      of demoStudents
    ) {
      const studentCode =
        generateCode(4)

      const passwordHash =
        await hashPassword(
          studentCode,
        )

      await Student.findOneAndUpdate(
        {
          schoolId:
            school._id,

          rollNumber:
            studentInput.rollNumber,
        },

        {
          schoolId:
            school._id,

          teacherId:
            teacher._id,

          ...studentInput,

          passwordHash,

          status:
            'active',
        },

        {
          upsert: true,
          new: true,
        },
      )

      createdStudents.push({
        fullName:
          studentInput.fullName,

        studentCode,
      })
    }

    /* =====================================================
       SUCCESS
       ===================================================== */

    logger.info(
      'Seed complete',
      {
        schoolCode:
          school.code,

        teacherEmail:
          teacher.email,

        students:
          createdStudents,
      },
    )

    console.log(
      '\n=== Talkora seed complete ===',
    )

    console.log(
      `School code:      ${school.code}`,
    )

    console.log(
      `School password:  ${env.seed.schoolPassword}`,
    )

    console.log(
      `Teacher email:    ${teacher.email}`,
    )

    console.log(
      `Teacher password: ${env.seed.teacherPassword}`,
    )

    console.log(
      'Student codes (dev only — regenerated on every reseed):',
    )

    for (
      const student
      of createdStudents
    ) {
      console.log(
        `  ${student.fullName}: ${student.studentCode}`,
      )
    }

    console.log(
      '==============================\n',
    )
  } finally {
    /*
     * Always release MongoDB, even if one seed operation
     * throws.
     */
    await disconnectDatabase()
  }
}

/* =========================================================
   START SEED
   ========================================================= */

seed().catch(
  (
    err,
  ) => {
    logger.error(
      'Seed failed',
      {
        err:
          err instanceof Error
            ? err.message
            : err,
      },
    )

    process.exit(1)
  },
)
