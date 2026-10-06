import {
  connectDatabase,
  disconnectDatabase,
} from '../config/db'

import { CurriculumClass } from '../models/CurriculumClass'
import { Level } from '../models/Level'
import { Lesson } from '../models/Lesson'
import { Activity } from '../models/Activity'

const objectives = [
  'Ask and answer questions about favourite things using full sentences',
  'Ask follow-up questions to learn more',
  'Use polite language when favourites differ',
  'Speak clearly and maintain eye contact',
  'Hold a meaningful conversation',
]

async function resolveLesson() {
  const lessonId =
    process.argv[2]?.trim()

  if (lessonId) {
    const lesson =
      await Lesson
        .findById(
          lessonId,
        )
        .lean()

    if (!lesson) {
      throw new Error(
        `Lesson ${lessonId} was not found`,
      )
    }

    return lesson
  }

  const klass =
    await CurriculumClass
      .findOne({
        grade: 4,
      })
      .lean()

  if (!klass) {
    throw new Error(
      'Class 4 curriculum not found',
    )
  }

  const level =
    await Level
      .findOne({
        classId:
          klass._id,

        number:
          1,
      })
      .lean()

  if (!level) {
    throw new Error(
      'Class 4 Level 1 not found',
    )
  }

  const lesson =
    await Lesson
      .findOne({
        levelId:
          level._id,
      })
      .sort({
        order: 1,
      })
      .lean()

  if (!lesson) {
    throw new Error(
      'Class 4 Level 1 lesson not found',
    )
  }

  return lesson
}

async function main() {
  if (!process.argv.includes('--run-retired-question-repeat-repair')) {
    console.info('This live repair is retired because it restores the old question-repeat lesson. Use pnpm migrate:unit1-pedagogy -- --apply instead.')
    return
  }

  await connectDatabase()

  try {
    const lesson =
      await resolveLesson()

    console.log(
      `Repairing lesson: ${lesson._id.toString()}`,
    )

    /*
     * ============================
     * ACTIVITY 2
     * ============================
     */

    await Activity
      .updateOne(
        {
          lessonId:
            lesson._id,

          order:
            2,
        },

        {
          $set: {
            title:
              'Meet Miss Julie',

            prompt:
              'Hi! What is your name?',

            teacherPrompt:
              'Hi! What is your name?',

            instruction:
              'Tell Miss Julie your name using a full sentence.',

            target:
              'My name is Aarav.',

            modelSentence:
              'My name is Aarav.',

            allowMic:
              true,

            allowOptions:
              false,

            aiEnabled:
              false,

            repeatRequired:
              true,

            maxConversationTurns:
              1,

            'metadata.conversationMode':
              'CONTROLLED',

            'metadata.digitalType':
              'PERSONAL_NAME',

            'metadata.expectedPhrase':
              'My name is Aarav.',

            'metadata.learningObjectives':
              objectives,
          },

          $unset: {
            'metadata.ttsText':
              1,
          },
        },

        {
          runValidators:
            true,
        },
      )

    /*
     * ============================
     * ACTIVITY 4
     * ============================
     */

    await Activity
      .updateOne(
        {
          lessonId:
            lesson._id,

          order:
            4,
        },

        {
          $set: {
            title:
              'Listen & Repeat',

            prompt:
              'Listen, then repeat: What is your favourite food?',

            teacherPrompt:
              'What is your favourite food?',

            instruction:
              'Listen to Miss Julie first, then repeat the question.',

            target:
              'What is your favourite food?',

            modelSentence:
              'What is your favourite food?',

            allowMic:
              true,

            allowOptions:
              false,

            aiEnabled:
              false,

            repeatRequired:
              true,

            'metadata.conversationMode':
              'CONTROLLED',

            'metadata.digitalType':
              'READ_REPEAT',

            'metadata.expectedPhrase':
              'What is your favourite food?',
          },

          $unset: {
            'metadata.ttsText':
              1,
          },
        },

        {
          runValidators:
            true,
        },
      )

    /*
     * ============================
     * ACTIVITY 5
     *
     * THIS IS YOUR SCREENSHOT.
     * ============================
     */

    await Activity
      .updateOne(
        {
          lessonId:
            lesson._id,

          order:
            5,
        },

        {
          $set: {
            title:
              'Listen, Repeat & Swap Roles',

            prompt:
              'Now you are part of the conversation.',

            teacherPrompt:
              'Hi! What is your name?',

            instruction:
              'Listen to Miss Julie, then answer with your name.',

            target:
              'My name is Aarav.',

            modelSentence:
              'My name is Aarav.',

            allowMic:
              true,

            allowOptions:
              false,

            aiEnabled:
              false,

            repeatRequired:
              true,

            maxConversationTurns:
              5,

            'metadata.conversationMode':
              'CONTROLLED',

            'metadata.digitalType':
              'EXACT_LINE_ROLE_SWAP',

            'metadata.expectedPhrase':
              'My name is Aarav.',

            'metadata.exactActiveLine':
              true,
          },

          $unset: {
            'metadata.ttsText':
              1,
          },
        },

        {
          runValidators:
            true,
        },
      )

    /*
     * ============================
     * OPEN CONVERSATIONS
     * ============================
     */

    const openers = [
      {
        order:
          6,

        text:
          'What is your favourite food?',
      },

      {
        order:
          8,

        text:
          'Ask me about my favourite food.',
      },

      {
        order:
          9,

        text:
          'What is your favourite place?',
      },

      {
        order:
          10,

        text:
          'Who do you enjoy it with?',
      },

      {
        order:
          11,

        text:
          'You told me what you like. What is the same or different about us?',
      },

      {
        order:
          12,

        text:
          "What's your name?",
      },
    ]

    for (
      const item
      of openers
    ) {
      await Activity
        .updateOne(
          {
            lessonId:
              lesson._id,

            order:
              item.order,
          },

          {
            $set: {
              prompt:
                item.text,

              teacherPrompt:
                item.text,

              'metadata.conversationMode':
                'OPEN',
            },

            $unset: {
              'metadata.ttsText':
                1,
            },
          },

          {
            runValidators:
              true,
          },
        )
    }

    const verify =
      await Activity
        .find({
          lessonId:
            lesson._id,
        })
        .sort({
          order: 1,
        })
        .select(
          'order title prompt teacherPrompt target type metadata',
        )
        .lean()

    console.log(
      '\n========== TALKORA LEVEL 1 LIVE DATA ==========\n',
    )

    for (
      const item
      of verify
    ) {
      console.log({
        order:
          item.order,

        title:
          item.title,

        prompt:
          item.prompt,

        teacherPrompt:
          item.teacherPrompt,

        target:
          item.target,

        type:
          item.type,

        digitalType:
          item
            .metadata
            ?.digitalType,

        conversationMode:
          item
            .metadata
            ?.conversationMode,
      })
    }

    console.log(
      '\n================================================\n',
    )
  } finally {
    await disconnectDatabase()
  }
}

void main()
  .catch(
    (
      error,
    ) => {
      console.error(
        'Level 1 repair failed:',

        error instanceof Error
          ? (
              error.stack ||
              error.message
            )
          : error,
      )

      process.exitCode =
        1
    },
  )
