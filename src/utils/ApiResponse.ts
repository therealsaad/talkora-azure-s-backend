import { Response } from 'express'

export function ok<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data })
}

export function okPaginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number },
) {
  return res.status(200).json({
    success: true,
    data,
    pagination: { ...pagination, pages: Math.ceil(pagination.total / pagination.limit) || 0 },
  })
}
