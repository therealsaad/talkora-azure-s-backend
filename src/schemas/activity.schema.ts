import { z } from 'zod'

export const submitAttemptSchema = z.object({
  body: z.object({
    answer: z.string().min(0).max(2000),
    startedAt: z.string().datetime(),
    hintsUsed: z.number().int().min(0).max(20).default(0),
    idempotencyKey: z.string().max(128).optional(),
  }),
  params: z.object({ activityId: z.string() }),
})
