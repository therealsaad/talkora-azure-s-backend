import { z } from 'zod'

export const startConversationSchema = z.object({
  body: z.object({
    lessonId: z.string().optional(),
    activityId: z.string().optional(),
    mode: z.enum(['FREE_TALK', 'LESSON', 'PRACTICE']).default('FREE_TALK'),
  }),
})

export const endConversationSchema = z.object({
  params: z.object({
    conversationId: z.string().min(1),
  }),
})

export const missJulieMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(1000),
    conversationId: z.string().optional(),
    lessonId: z.string().optional(),
    activityId: z.string().optional(),
    context: z.enum([
      'lesson_instruction',
      'activity_feedback',
      'hint',
      'mistake_correction',
      'encouragement',
      'speaking',
      'pronunciation',
      'review',
      'level_completion',
      'recommendation',
      'conversation',
      'general',
    ]).default('general'),
    inputMode: z.enum(['OPTION', 'MIC', 'TEXT']).default('TEXT'),
  }),
})

export const aiStructuredResponseSchema = z.object({
  message: z.string(),
  emotion: z.enum([
    'greeting',
    'welcome',
    'curious',
    'listening',
    'thinking',
    'delighted',
    'encouraging',
    'gentle_correction',
    'modeling',
    'proud',
    'surprised',
    'retry',
    'gentle_retry',
    'hinting',
    'celebrating',
    'concerned',
  ]),
  responseQuality: z.enum(['STRONG', 'ADEQUATE', 'PARTIAL', 'UNCLEAR']).default('ADEQUATE'),
  evaluation: z
    .object({ correct: z.boolean(), score: z.number().min(0).max(100), feedback: z.string() })
    .optional(),
  corrections: z.array(z.string()).default([]),
  correction: z.object({
    needed: z.boolean(),
    original: z.string(),
    corrected: z.string(),
    explanation: z.string(),
  }).optional(),
  hint: z.string().nullable().optional(),
  followUpQuestion: z.string().max(250).nullable().optional(),
  memoryUpdates: z
    .array(
      z.object({
        key: z.string().optional(),
        value: z.string().trim().min(1).max(120),
        category: z.enum(['preference', 'vocabulary', 'grammar', 'pronunciation', 'speaking', 'behavior']),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(5)
    .default([]),
  xpAwarded: z.number().min(0).max(1000).default(0),
  recommendation: z.string().nullable().optional(),
  teachingAction: z.enum([
    'CONTINUE_CONVERSATION',
    'ACKNOWLEDGE',
    'GENTLE_CORRECTION',
    'MODEL_FULL_SENTENCE',
    'MODEL_SENTENCE',
    'WAIT_FOR_REPEAT',
    'ASK_FOLLOW_UP',
    'PROMPT_STUDENT_QUESTION',
    'GIVE_HINT',
    'CELEBRATE_IMPROVEMENT',
    'CLARIFY',
    'COMPLETE_EPISODE',
    'CONTINUE',
    'RETRY',
    'OFFER_OPTIONS',
    'COMPLETE',
  ]).nullable().optional(),
  modelSentence: z.string().max(300).nullable().optional(),
  activityComplete: z.boolean().optional(),
  shouldRetry: z.boolean().default(false),
  hintLevel: z.number().int().min(0).max(3).default(0),
  detectedSkills: z.array(z.string()).max(12).default([]),
  remainingSkills: z.array(z.string()).max(12).default([]),
})
