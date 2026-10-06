import {
  Schema,
  model,
  Document,
  Types,
} from 'mongoose'

/* =========================================================
   ACTIVITY TYPES
   ========================================================= */

export const ACTIVITY_TYPES = [
  'MCQ',

  'PICTURE_CHOICE',

  'MATCHING',

  'SPELLING',

  'LISTENING',

  'LISTEN_AND_REPEAT',

  'WORD_RECOGNITION',

  'SENTENCE_BUILDER',

  'READING',

  'PRONUNCIATION',

  'SPEAKING',

  'CONVERSATION',

  'REVIEW',

  /* =======================================================
     TALKORA CURRICULUM TYPES
     ======================================================= */

  'LIKE_DISLIKE',

  'LISTEN_MODEL',

  'REPEAT_SENTENCE',

  'VISUAL_CHOICE',

  'SPEAK_PROMPT',

  'OPEN_CONVERSATION',

  'FOLLOW_UP_CONVERSATION',

  'ROLEPLAY',

  'INTERVIEW',

  'PRESENTATION',

  'DESCRIBE_IMAGE',

  'FINAL_CONVERSATION',
] as const

export type ActivityType =
  (typeof ACTIVITY_TYPES)[number]

/* =========================================================
   ACTIVITY STAGES
   ========================================================= */

export const ACTIVITY_STAGES = [
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

  'BONUS',

  'HOME_PRACTICE',

  'REWARD',
] as const

export type ActivityStage =
  (typeof ACTIVITY_STAGES)[number]

/* =========================================================
   ACTIVITY STATUS
   ========================================================= */

export const ACTIVITY_STATUSES = [
  'active',

  'draft',

  'archived',
] as const

export type ActivityStatus =
  (typeof ACTIVITY_STATUSES)[number]

/* =========================================================
   SOURCE
   ========================================================= */

export interface ActivitySource {
  sourceType:
    | 'SYLLABUS'
    | 'ENRICHMENT'

  pdf?: string

  pageStart?: number

  pageEnd?: number

  label?: string
}

/* =========================================================
   CONVERSATION GOAL
   ========================================================= */

export interface ActivityConversationGoal {
  requiredConcepts: string[]

  minTurns: number

  maxTurns: number
}

/* =========================================================
   ACTIVITY INTERFACE
   ========================================================= */

export interface IActivity
  extends Document {
  _id: Types.ObjectId

  lessonId: Types.ObjectId

  /* =======================================================
     CURRICULUM IDENTITY
     ======================================================= */

  curriculumVersion?: string

  activityKey?: string

  grade?: number

  term?: number

  unitNumber?: number

  /* =======================================================
     ACTIVITY CONFIG
     ======================================================= */

  type: ActivityType

  stage: ActivityStage

  core: boolean

  required: boolean

  title: string

  prompt: string

  instruction?: string

  order: number

  /* =======================================================
     LEARNING CONTENT
     ======================================================= */

  target?: string

  teacherPrompt?: string

  modelSentence?: string

  expectedPatterns: string[]

  keywords: string[]

  hint?: string

  content?:
    Record<
      string,
      unknown
    >

  choices?: string[]

  /* =======================================================
     ANSWER CONFIG

     Never return these fields to student clients.
     ======================================================= */

  answer?: string

  answerConfig?:
    Record<
      string,
      unknown
    >

  /* =======================================================
     ACTIVITY BEHAVIOUR
     ======================================================= */

  difficulty:
    | 'easy'
    | 'medium'
    | 'hard'

  xp: number

  estimatedSeconds: number

  voiceEnabled: boolean

  aiEnabled: boolean

  allowMic: boolean

  allowOptions: boolean

  repeatRequired: boolean

  maxConversationTurns: number

  conversationGoal?:
    ActivityConversationGoal

  /* =======================================================
     SOURCE PROVENANCE
     ======================================================= */

  source?: ActivitySource

  metadata?:
    Record<
      string,
      unknown
    >

  status: ActivityStatus

  createdAt: Date

  updatedAt: Date
}

/* =========================================================
   SUBSCHEMA — CONVERSATION GOAL
   ========================================================= */

const conversationGoalSchema =
  new Schema<ActivityConversationGoal>(
    {
      requiredConcepts: {
        type: [
          String,
        ],

        default: [],
      },

      minTurns: {
        type:
          Number,

        min: 1,

        max: 15,

        default:
          1,
      },

      maxTurns: {
        type:
          Number,

        min: 1,

        max: 15,

        default:
          4,
      },
    },

    {
      _id:
        false,
    },
  )

/* =========================================================
   SUBSCHEMA — SOURCE
   ========================================================= */

const activitySourceSchema =
  new Schema<ActivitySource>(
    {
      sourceType: {
        type:
          String,

        enum: [
          'SYLLABUS',
          'ENRICHMENT',
        ],

        required:
          true,
      },

      pdf: {
        type:
          String,

        trim:
          true,
      },

      pageStart: {
        type:
          Number,

        min:
          1,
      },

      pageEnd: {
        type:
          Number,

        min:
          1,
      },

      label: {
        type:
          String,

        trim:
          true,
      },
    },

    {
      _id:
        false,
    },
  )

/* =========================================================
   ACTIVITY SCHEMA
   ========================================================= */

const activitySchema =
  new Schema<IActivity>(
    {
      /* ===================================================
         OWNERSHIP
         =================================================== */

      lessonId: {
        type:
          Schema.Types
            .ObjectId,

        ref:
          'Lesson',

        required:
          true,

        index:
          true,
      },

      /* ===================================================
         CURRICULUM IDENTITY
         =================================================== */

      curriculumVersion: {
        type:
          String,

        trim:
          true,

        index:
          true,
      },

      activityKey: {
        type:
          String,

        trim:
          true,

        index:
          true,
      },

      grade: {
        type:
          Number,

        min:
          4,

        max:
          15,
      },

      term: {
        type:
          Number,

        min:
          1,

        max:
          4,
      },

      unitNumber: {
        type:
          Number,

        min:
          1,
      },

      /* ===================================================
         ACTIVITY IDENTITY
         =================================================== */

      type: {
        type:
          String,

        enum:
          ACTIVITY_TYPES,

        required:
          true,
      },

      stage: {
        type:
          String,

        enum:
          ACTIVITY_STAGES,

        required:
          true,

        default:
          'PRACTICE_ZONE',
      },

      core: {
        type:
          Boolean,

        default:
          true,
      },

      required: {
        type:
          Boolean,

        default:
          true,
      },

      /* ===================================================
         TEXT
         =================================================== */

      title: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      prompt: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      instruction: {
        type:
          String,

        trim:
          true,
      },

      order: {
        type:
          Number,

        required:
          true,

        min:
          1,
      },

      target: {
        type:
          String,

        trim:
          true,
      },

      teacherPrompt: {
        type:
          String,

        trim:
          true,
      },

      modelSentence: {
        type:
          String,

        trim:
          true,
      },

      expectedPatterns: {
        type: [
          String,
        ],

        default: [],
      },

      keywords: {
        type: [
          String,
        ],

        default: [],
      },

      hint: {
        type:
          String,

        trim:
          true,
      },

      /* ===================================================
         STRUCTURED CONTENT
         =================================================== */

      content: {
        type:
          Schema.Types
            .Mixed,
      },

      choices: {
        type: [
          String,
        ],

        default:
          undefined,
      },

      /* ===================================================
         ANSWER CONFIG
         =================================================== */

      answer: {
        type:
          String,

        select:
          false,
      },

      answerConfig: {
        type:
          Schema.Types
            .Mixed,

        select:
          false,
      },

      /* ===================================================
         DIFFICULTY / REWARD
         =================================================== */

      difficulty: {
        type:
          String,

        enum: [
          'easy',
          'medium',
          'hard',
        ],

        default:
          'easy',
      },

      xp: {
        type:
          Number,

        min:
          0,

        default:
          10,
      },

      estimatedSeconds: {
        type:
          Number,

        min:
          0,

        default:
          60,
      },

      /* ===================================================
         VOICE / AI
         =================================================== */

      voiceEnabled: {
        type:
          Boolean,

        default:
          false,
      },

      aiEnabled: {
        type:
          Boolean,

        default:
          false,
      },

      allowMic: {
        type:
          Boolean,

        default:
          false,
      },

      allowOptions: {
        type:
          Boolean,

        default:
          false,
      },

      repeatRequired: {
        type:
          Boolean,

        default:
          false,
      },

      maxConversationTurns: {
        type:
          Number,

        min:
          1,

        max:
          15,

        default:
          4,
      },

      conversationGoal: {
        type:
          conversationGoalSchema,

        default:
          undefined,
      },

      /* ===================================================
         SOURCE PROVENANCE
         =================================================== */

      source: {
        type:
          activitySourceSchema,

        default:
          undefined,
      },

      metadata: {
        type:
          Schema.Types
            .Mixed,
      },

      /* ===================================================
         STATUS
         =================================================== */

      status: {
        type:
          String,

        enum:
          ACTIVITY_STATUSES,

        default:
          'active',
      },
    },

    {
      timestamps:
        true,
    },
  )

/* =========================================================
   VALIDATION
   ========================================================= */

activitySchema.pre(
  'validate',
  function (
    next,
  ) {
    /* =====================================================
       CONVERSATION TURN SAFETY
       ===================================================== */

    if (
      this.conversationGoal
    ) {
      if (
        this
          .conversationGoal
          .maxTurns <
        this
          .conversationGoal
          .minTurns
      ) {
        return next(
          new Error(
            'conversationGoal.maxTurns must be greater than or equal to minTurns',
          ),
        )
      }

      if (
        this
          .maxConversationTurns <
        this
          .conversationGoal
          .maxTurns
      ) {
        this.maxConversationTurns =
          this
            .conversationGoal
            .maxTurns
      }
    }

    /* =====================================================
       MIC CONSISTENCY
       ===================================================== */

    if (
      this.allowMic
    ) {
      this.voiceEnabled =
        true
    }

    /* =====================================================
       OPEN CONVERSATION CONSISTENCY
       ===================================================== */

    if (
      [
        'OPEN_CONVERSATION',

        'FOLLOW_UP_CONVERSATION',

        'ROLEPLAY',

        'INTERVIEW',

        'FINAL_CONVERSATION',
      ].includes(
        this.type,
      )
    ) {
      this.aiEnabled =
        true

      this.voiceEnabled =
        true

      this.allowMic =
        true
    }

    next()
  },
)

/* =========================================================
   INDEXES
   ========================================================= */

/**
 * Existing lesson ordering.
 */
activitySchema.index(
  {
    lessonId: 1,

    order: 1,
  },

  {
    unique:
      true,
  },
)

/**
 * Fast syllabus stage ordering.
 */
activitySchema.index({
  lessonId: 1,

  stage: 1,

  order: 1,
})

/**
 * Stable curriculum identity.
 *
 * Sparse is important because legacy activities may not yet
 * have curriculumVersion/activityKey.
 */
activitySchema.index(
  {
    curriculumVersion:
      1,

    activityKey:
      1,
  },

  {
    unique:
      true,

    sparse:
      true,
  },
)

/**
 * Future grade-scoped curriculum lookup.
 */
activitySchema.index({
  curriculumVersion:
    1,

  grade:
    1,

  term:
    1,

  unitNumber:
    1,

  order:
    1,
})

/* =========================================================
   MODEL
   ========================================================= */

export const Activity =
  model<IActivity>(
    'Activity',
    activitySchema,
  )
