import { Types } from 'mongoose'
import { StudentMemory } from '../../src/models/StudentMemory'
import { MemoryService, extractVerifiedPersonalFacts, relevantMemoryKeys } from '../../src/services/memory.service'

describe('verified student memory', () => {
  afterEach(() => jest.restoreAllMocks())

  it('extracts only explicit, allowlisted personal claims', () => {
    expect(extractVerifiedPersonalFacts('My favourite sport is cricket. My hobby is painting.')).toEqual([
      { key: 'favouriteSport', value: 'cricket', confidence: 0.92 },
      { key: 'hobby', value: 'painting', confidence: 0.9 },
    ])
    expect(extractVerifiedPersonalFacts('Do you like cricket? Maybe pizza.')).toEqual([])
  })

  it('maps only memories relevant to the current curriculum objective', () => {
    expect([...relevantMemoryKeys(['favourite_sport', 'sport_reason'])]).toEqual(['favouriteSport'])
    expect([...relevantMemoryKeys(['extended_favourite'])]).toEqual(['favouritePlace', 'favouriteAnimal', 'favouriteFestival'])
  })

  it('does not persist scaffold option clicks', async () => {
    const update = jest.spyOn(StudentMemory, 'findOneAndUpdate')
    await MemoryService.persistVerifiedPersonalFacts({ studentId: new Types.ObjectId().toString(), transcript: 'My favourite sport is cricket.', inputMode: 'OPTION', conversationId: new Types.ObjectId().toString(), turn: 1 })
    expect(update).not.toHaveBeenCalled()
  })

  it('upserts and reinforces one key per student without duplicates or leakage', async () => {
    const studentA = new Types.ObjectId().toString()
    const studentB = new Types.ObjectId().toString()
    const conversationId = new Types.ObjectId().toString()
    const update = jest.spyOn(StudentMemory, 'findOneAndUpdate').mockResolvedValue({} as never)

    for (const studentId of [studentA, studentA, studentB]) {
      await MemoryService.persistVerifiedPersonalFacts({ studentId, transcript: 'My favourite sport is cricket.', inputMode: 'MIC', conversationId, turn: 1 })
    }

    expect(update).toHaveBeenCalledTimes(3)
    expect(update.mock.calls[0]?.[0]).toEqual({ studentId: studentA, key: 'favouriteSport' })
    expect(update.mock.calls[1]?.[0]).toEqual({ studentId: studentA, key: 'favouriteSport' })
    expect(update.mock.calls[2]?.[0]).toEqual({ studentId: studentB, key: 'favouriteSport' })
    expect(update.mock.calls[0]?.[2]).toMatchObject({ upsert: true, new: true })
  })

  it('loads only confident personal facts for the requested student and objective', async () => {
    const lean = jest.fn().mockResolvedValue([])
    const limit = jest.fn(() => ({ lean }))
    const sort = jest.fn(() => ({ limit }))
    const find = jest.spyOn(StudentMemory, 'find').mockReturnValue({ sort } as never)
    const studentId = new Types.ObjectId().toString()

    await MemoryService.relevantPersonalFacts(studentId, ['favourite_sport'])

    expect(find).toHaveBeenCalledWith({ studentId, category: 'preference', confidence: { $gte: 0.7 }, key: { $in: ['favouriteSport'] } })
  })

  it('persists learning evidence under a separate keyed category', async () => {
    const update = jest.spyOn(StudentMemory, 'findOneAndUpdate').mockResolvedValue({} as never)
    const studentId = new Types.ObjectId().toString()
    const conversationId = new Types.ObjectId().toString()

    await MemoryService.persistLearningEvidence({
      studentId,
      conversationId,
      evidence: [{ skill: 'give_reason', support: 'SUPPORTED', utterance: 'Because it is fun.', turn: 2 }],
    })

    expect(update).toHaveBeenCalledWith(
      { studentId, key: 'learning:give_reason' },
      expect.objectContaining({ $set: expect.objectContaining({ category: 'speaking', confidence: 0.65 }) }),
      expect.objectContaining({ upsert: true, new: true }),
    )
  })

  it('does not create personal memory from an incomplete claim', async () => {
    const update = jest.spyOn(StudentMemory, 'findOneAndUpdate')
    await MemoryService.persistVerifiedPersonalFacts({
      studentId: new Types.ObjectId().toString(),
      transcript: 'My favourite sport is',
      inputMode: 'MIC',
      conversationId: new Types.ObjectId().toString(),
      turn: 1,
    })
    expect(update).not.toHaveBeenCalled()
  })
})
