import { z } from 'zod'

export const schoolLoginSchema = z.object({
  body: z.object({
    schoolCode: z.string().trim().min(3).max(32),
    password: z.string().min(6).max(128),
  }),
})

export const teacherLoginSchema = z.object({
  body: z.object({
    schoolCode: z.string().trim().min(3).max(32),
    email: z.string().trim().email(),
    password: z.string().min(6).max(128),
  }),
})

export const studentSchoolLookupSchema = z.object({
  body: z.object({
    schoolCode: z.string().trim().min(3).max(32),
    grade: z.number().int().min(0).max(10).optional(),
    className: z.string().trim().min(1).max(32).optional(),
    q: z.string().trim().max(80).optional(),
    page: z.number().int().min(1).max(10000).default(1),
    limit: z.number().int().min(1).max(24).default(24),
  }),
})

export const studentLoginSchema = z.object({
  body: z.object({
    schoolCode: z.string().trim().min(3).max(32),
    studentId: z.string().trim().min(1),
    studentCode: z.string().trim().min(3).max(32),
  }),
})

export const studentPinLoginSchema = z.object({ body: z.object({ pin: z.string().regex(/^\d{5}$/, 'Enter a 5-digit PIN') }) })
