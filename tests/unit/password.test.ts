import { hashPassword, comparePassword } from '../../src/utils/password'

describe('password hashing', () => {
  it('hashes a password and verifies it correctly', async () => {
    const hash = await hashPassword('talkora123')
    expect(hash).not.toEqual('talkora123')
    await expect(comparePassword('talkora123', hash)).resolves.toBe(true)
    await expect(comparePassword('wrong-password', hash)).resolves.toBe(false)
  })
})
