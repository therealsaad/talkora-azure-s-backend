import { z } from 'zod'

export const createStudentSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(100),
    rollNumber: z.string().trim().min(1).max(20),
    grade: z.number().int().min(4).max(10),
    className: z.string().trim().max(20).optional(),
    teacherId: z.string().optional(),
    avatar: z.string().optional(),
    avatarType: z.enum(['BOY', 'GIRL']),
  }),
})

export const updateStudentSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(100).optional(),
    rollNumber: z.string().trim().min(1).max(20).optional(),
    grade: z.number().int().min(4).max(10).optional(),
    className: z.string().trim().max(20).optional(),
    teacherId: z.string().optional(),
    avatar: z.string().optional(),
    avatarType: z.enum(['BOY', 'GIRL']).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
  params: z.object({ id: z.string() }),
})

export const updateStudentAvatarSchema = z.object({
  body: z.object({
    avatar: z.string().trim().min(1).max(200),
    avatarType: z.enum(['BOY', 'GIRL']),
  }),
})

export const listStudentsQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    grade: z.coerce.number().int().min(4).max(10).optional(),
    className: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().optional(),
  }),
})
