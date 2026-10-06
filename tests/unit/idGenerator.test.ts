import { generateCode } from '../../src/utils/idGenerator'

describe('generateCode', () => {
  it('generates a code of the requested length', () => {
    const code = generateCode(6)
    expect(code).toHaveLength(6)
  })

  it('never includes ambiguous characters (0, O, 1, I)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCode(10)
      expect(code).not.toMatch(/[01OI]/)
    }
  })
})
