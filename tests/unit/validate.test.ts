import { z } from 'zod'
import { validate } from '../../src/middleware/validate'

function mockReqRes(body: unknown) {
  const req: any = { body, params: {}, query: {} }
  const res: any = {}
  return { req, res }
}

describe('validate middleware', () => {
  const schema = z.object({ body: z.object({ schoolCode: z.string().min(3) }) })

  it('calls next() with no error on valid input', () => {
    const { req, res } = mockReqRes({ schoolCode: 'DEMO001' })
    const next = jest.fn()
    validate(schema)(req, res, next)
    expect(next).toHaveBeenCalledWith()
  })

  it('calls next(ApiError) on invalid input', () => {
    const { req, res } = mockReqRes({ schoolCode: 'x' })
    const next = jest.fn()
    validate(schema)(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    const err = next.mock.calls[0][0]
    expect(err.statusCode).toBe(400)
  })
})
