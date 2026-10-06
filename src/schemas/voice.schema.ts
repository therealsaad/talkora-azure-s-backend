import { z } from 'zod'

export const startVoiceSessionSchema =
  z.object({
    body:
      z.object({
        lessonId:
          z.string().optional(),

        activityId:
          z.string().optional(),

        expectedPhrase:
          z.string()
            .trim()
            .min(1)
            .max(300)
            .optional(),
      })
      .strict(),
  })

export const submitVoiceTranscriptSchema =
  z.object({
    body:
      z.object({
        transcript:
          z.string()
            .trim()
            .min(1)
            .max(2000),

        inputMode:
          z.enum([
            'MIC',
            'TEXT',
            'OPTION',
          ])
          .optional()
          .default('MIC'),
      })
      .strict(),

    params:
      z.object({
        sessionId:
          z.string(),
      }),
  })

export const synthesizeVoiceSchema =
  z.object({
    body:
      z.object({
        text:
          z.string()
            .trim()
            .min(1)
            .max(2000),

        purpose:
          z.enum([
            'PAGE_GUIDANCE',
            'LESSON',
            'CONVERSATION',
            'FEEDBACK',
          ])
          .optional(),

        language:
          z.string()
            .trim()
            .min(2)
            .max(16)
            .optional(),
      })
      .strict(),
  })

export const transcribeVoiceSchema =
  z.object({
    body:
      z.object({
        audioBase64:
          z.string()
            .min(1)
            .max(8_000_000)
            .optional(),

        mimeType:
          z.string()
            .max(80)
            .optional(),

        durationMs:
          z.coerce
            .number()
            .int()
            .min(250)
            .max(10_000)
            .optional(),

        mode:
          z.enum([
            'fast',
            'accurate',
          ])
          .optional(),
      }),
  })
