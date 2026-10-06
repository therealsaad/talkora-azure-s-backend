import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { Types } from 'mongoose'
import { Conversation } from '../../src/models/Conversation'
import { GroqProvider } from '../../src/providers/ai/GroqProvider'
import { QwenProvider } from '../../src/providers/ai/QwenProvider'
import { env } from '../../src/config/env'
import { MemoryService } from '../../src/services/memory.service'
import { MissJulieService } from '../../src/services/missJulie.service'
import { StudentContextService } from '../../src/services/student-context.service'

describe('Miss Julie live conversation provider', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('uses the configured Groq brain for a student conversation turn', async () => {
    const studentId = new Types.ObjectId().toString()
    const conversationId = new Types.ObjectId()
    const previousNodeEnv = env.nodeEnv
    const previousAiProvider = env.aiProvider
    env.nodeEnv = 'development'
    env.aiProvider = 'groq'

    jest.spyOn(StudentContextService, 'buildContext').mockResolvedValue({
      studentName: 'Aarav',
      grade: 4,
      levelTitle: 'Favourite Fair',
      lessonTitle: 'My Favourite Things',
      recentMistakes: [],
      memoryFacts: [],
      promptContext: 'conversation',
      studentMessage: 'My favourite sport is cricket.',
      remainingConcepts: [],
    })
    jest.spyOn(Conversation, 'findOne').mockReturnValue({
      sort: jest.fn<() => Promise<null>>().mockResolvedValue(null),
    } as never)
    jest.spyOn(Conversation, 'findOneAndUpdate').mockResolvedValue({
      _id: conversationId,
      createdAt: new Date(),
      status: 'ACTIVE',
      turnCount: 1,
      goalState: [],
      skillEvidence: [],
      retryState: {
        waiting: false,
        targetSkill: '',
        attempt: 0,
        hintLevel: 0,
        originalUtterance: '',
      },
      masteryStatus: 'IN_PROGRESS',
    } as never)
    jest.spyOn(MemoryService, 'persistVerifiedPersonalFacts').mockResolvedValue([])

    const groq = jest.spyOn(GroqProvider.prototype, 'generate').mockResolvedValue({
      message: 'Groq heard your cricket answer.',
      emotion: 'encouraging',
      corrections: [],
      followUpQuestion: 'Who do you play with?',
      memoryUpdates: [],
      xpAwarded: 0,
    })
    const qwen = jest.spyOn(QwenProvider.prototype, 'generate').mockResolvedValue({
      message: 'This reply came from Qwen.',
      emotion: 'encouraging',
      corrections: [],
      followUpQuestion: null,
      memoryUpdates: [],
      xpAwarded: 0,
    })

    try {
      const response = await MissJulieService.converse(studentId, {
        message: 'My favourite sport is cricket.',
        inputMode: 'TEXT',
      })

      expect(response.message).toBe('Groq heard your cricket answer.')
      expect(response.followUpQuestion).toBe('Who do you play with?')
    } finally {
      env.nodeEnv = previousNodeEnv
      env.aiProvider = previousAiProvider
      groq.mockRestore()
      qwen.mockRestore()
    }
  })
})
