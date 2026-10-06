import { z } from 'zod'

export const educatorChatRequestSchema = z.object({
  body: z.object({
    message: z.string().trim().min(2).max(1000),
    contextType: z.enum(['DASHBOARD', 'CLASS', 'STUDENT']).default('DASHBOARD'),
    contextId: z.string().trim().optional(),
  }),
})

export const educatorAIResponseSchema = z.object({
  summary: z.string().max(1200),
  insights: z.array(z.object({
    title: z.string().max(120),
    detail: z.string().max(500),
    type: z.enum(['PROGRESS', 'ATTENTION', 'ENGAGEMENT', 'SKILL']),
  })).max(6),
  actions: z.array(z.object({ label: z.string().max(160), reason: z.string().max(400) })).max(6),
  followUpSuggestions: z.array(z.string().max(160)).max(5),
})

export type EducatorAIResponse = z.infer<typeof educatorAIResponseSchema>
