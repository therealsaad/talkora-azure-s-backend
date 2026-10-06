import { z } from 'zod'

export const saveHomePracticeSchema = z.object({
  body: z.object({ reflection: z.string().trim().min(1).max(1000) }),
})
