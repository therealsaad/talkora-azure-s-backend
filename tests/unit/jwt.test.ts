import { signToken, verifyToken } from '../../src/utils/jwt'

describe('jwt', () => {
  it('signs and verifies a token round-trip', () => {
    const token = signToken({ sub: 'student-123', role: 'STUDENT', schoolId: 'school-abc' })
    const payload = verifyToken(token)
    expect(payload.sub).toBe('student-123')
    expect(payload.role).toBe('STUDENT')
    expect(payload.schoolId).toBe('school-abc')
  })

  it('rejects a tampered token', () => {
    const token = signToken({ sub: 's', role: 'STUDENT', schoolId: 'x' })
    const tampered = token.slice(0, -2) + 'ab'
    expect(() => verifyToken(tampered)).toThrow()
  })
})
