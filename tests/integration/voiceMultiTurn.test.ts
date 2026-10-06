import { Types } from 'mongoose'
import { VoiceSession } from '../../src/models/VoiceSession'
import { VoiceService } from '../../src/services/voice.service'
import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from './dbTestUtils'

beforeAll(async () => connectTestDatabase())
afterAll(async () => disconnectTestDatabase())
afterEach(async () => clearTestDatabase())

describe('multi-turn microphone session lifecycle', () => {
  it('creates a fresh voice submission for each of eight turns while preserving exact turn targets', async () => {
    const studentId = new Types.ObjectId().toString()
    const ids = new Set<string>()

    for (let turn = 1; turn <= 8; turn += 1) {
      const expectedPhrase = `Exact model line ${turn}`
      const session = await VoiceService.startSession(studentId, { expectedPhrase })
      ids.add(session._id.toString())
      expect(session.metadata?.expectedPhrase).toBe(expectedPhrase)

      session.status = 'completed'
      session.transcript = `Student answer ${turn}`
      session.endedAt = new Date()
      await session.save()
    }

    expect(ids.size).toBe(8)
    expect(await VoiceSession.countDocuments({ studentId })).toBe(8)
    expect(await VoiceSession.countDocuments({ studentId, status: 'completed' })).toBe(8)
  })
})
