import { ApiError } from '../../src/utils/ApiError'

describe('ApiError factories', () => {
  it('builds a 401 for unauthorized', () => {
    const err = ApiError.unauthorized()
    expect(err.statusCode).toBe(401)
    expect(err.code).toBe('UNAUTHORIZED')
  })

  it('builds a 422 business rule error (e.g. locked level)', () => {
    const err = ApiError.businessRule('This level is locked.')
    expect(err.statusCode).toBe(422)
    expect(err.code).toBe('BUSINESS_RULE_ERROR')
  })
})
