import { NextFunction, Request, Response } from 'express'
import { AnyZodObject, ZodError } from 'zod'
import { ApiError } from '../utils/ApiError'

/** Validates body/params/query against a Zod schema and replaces req fields with the parsed (typed, coerced) values. */
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({ body: req.body, params: req.params, query: req.query })
      if (parsed.body) req.body = parsed.body
      if (parsed.params) req.params = parsed.params
      if (parsed.query) req.query = parsed.query
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        next(ApiError.badRequest('Request validation failed', err.issues))
      } else {
        next(err)
      }
    }
  }
}
