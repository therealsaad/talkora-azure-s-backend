import { Types } from 'mongoose'
import { StudentMemory } from '../../src/models/StudentMemory'
import { MemoryService } from '../../src/services/memory.service'
import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from './dbTestUtils'

beforeAll(async () => connectTestDatabase())
afterAll(async () => disconnectTestDatabase())
afterEach(async () => clearTestDatabase())

describe('student memory persistence', () => {
  it('persists, reinforces, reloads, filters, and isolates verified memories', async () => {
    const studentA = new Types.ObjectId().toString()
    const studentB = new Types.ObjectId().toString()
    const activityId = new Types.ObjectId().toString()

    await MemoryService.persistVerifiedPersonalFacts({
      studentId: studentA, transcript: 'My favourite sport is cricket.', inputMode: 'MIC',
      activityId, conversationId: new Types.ObjectId().toString(), turn: 1,
    })
    await MemoryService.persistVerifiedPersonalFacts({
      studentId: studentA, transcript: 'My favourite sport is cricket.', inputMode: 'MIC',
      activityId, conversationId: new Types.ObjectId().toString(), turn: 1,
    })
    await MemoryService.persistVerifiedPersonalFacts({
      studentId: studentA, transcript: 'My favourite food is dosa.', inputMode: 'MIC',
      activityId, conversationId: new Types.ObjectId().toString(), turn: 2,
    })
    await MemoryService.persistVerifiedPersonalFacts({
      studentId: studentB, transcript: 'My favourite sport is football.', inputMode: 'MIC',
      activityId, conversationId: new Types.ObjectId().toString(), turn: 1,
    })

    expect(await StudentMemory.countDocuments({ studentId: studentA, key: 'favouriteSport' })).toBe(1)
    const newSessionContext = await MemoryService.relevantPersonalFacts(studentA, ['favourite_sport'])
    expect(newSessionContext).toHaveLength(1)
    expect(newSessionContext[0]).toMatchObject({ key: 'favouriteSport', value: 'cricket', source: 'system' })
    expect(newSessionContext.some((item) => item.key === 'favouriteFood')).toBe(false)
    expect(newSessionContext.some((item) => item.value === 'football')).toBe(false)
  })
})
