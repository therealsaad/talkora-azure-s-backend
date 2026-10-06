import { z } from 'zod'

export const idParamSchema = z.object({ params: z.object({ id: z.string() }) })

export const listLevelsQuerySchema = z.object({
  params: z.object({ classId: z.string() }),
})

export const listActivitiesQuerySchema = z.object({
  params: z.object({ lessonId: z.string() }),
})
