import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { env } from '../../src/config/env'
import { GeminiConversationProvider } from '../../src/providers/ai/GeminiConversationProvider'
import type { MissJulieContext } from '../../src/providers/ai/AIProvider'

describe('Gemini free-talk provider', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('sends recent dialogue and the learner reply to the configured Gemini API', async () => {
    const previousApiKey = env.geminiApiKey
    const previousModel = env.geminiModel
    const previousFallbackModel = env.geminiFallbackModel
    env.geminiApiKey = 'test-gemini-key'
    env.geminiModel = 'gemini-test-model'
    env.geminiFallbackModel = ''

    const responseText = `\`\`\`json\n${JSON.stringify({
      message: 'That sounds like an exciting adventure.',
      emotion: 'curious',
      responseQuality: 'ADEQUATE',
      corrections: [],
      correction: { needed: false, original: '', corrected: '', explanation: '' },
      hint: null,
      followUpQuestion: 'What did you see there?',
      memoryUpdates: [],
      teachingAction: 'ASK_FOLLOW_UP',
      modelSentence: null,
      shouldRetry: false,
      hintLevel: 0,
    })}\n\`\`\``
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [{ text: responseText }],
          },
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )

    const context: MissJulieContext = {
      studentName: 'Aarav',
      grade: 4,
      levelTitle: 'Talkora Adventure',
      lessonTitle: 'English Practice',
      recentMistakes: [],
      memoryFacts: [],
      promptContext: 'conversation',
      studentMessage: 'I went to the zoo yesterday.',
      conversationHistory: [
        'missJulie: What did you do yesterday?',
        'student: I went to the zoo yesterday.',
      ],
    }

    try {
      const result = await new GeminiConversationProvider().generate(context)

      expect(result.message).toBe('That sounds like an exciting adventure.')
      expect(result.followUpQuestion).toBe('What did you see there?')
      expect(fetchMock).toHaveBeenCalledTimes(1)

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toContain('/models/gemini-test-model:generateContent')
      expect((init.headers as Record<string, string>)['X-goog-api-key']).toBe('test-gemini-key')
      expect(String(init.body)).toContain('I went to the zoo yesterday.')
      expect(String(init.body)).toContain('What did you do yesterday?')
      expect(String(init.body)).toContain('"responseSchema"')
    } finally {
      env.geminiApiKey = previousApiKey
      env.geminiModel = previousModel
      env.geminiFallbackModel = previousFallbackModel
    }
  })

  it('retries a transient 503 from the configured Gemini API before returning a provider error', async () => {
    const previousApiKey = env.geminiApiKey
    const previousModel = env.geminiModel
    const previousFallbackModel = env.geminiFallbackModel
    env.geminiApiKey = 'test-gemini-key'
    env.geminiModel = 'gemini-test-model'
    env.geminiFallbackModel = ''

    const responseText = JSON.stringify({
      message: 'You visited the zoo yesterday.',
      emotion: 'encouraging',
      responseQuality: 'ADEQUATE',
      corrections: [],
      correction: { needed: false, original: '', corrected: '', explanation: '' },
      hint: null,
      followUpQuestion: 'Which animal did you like best?',
      memoryUpdates: [],
      teachingAction: 'ASK_FOLLOW_UP',
      modelSentence: null,
      shouldRetry: false,
      hintLevel: 0,
    })
    const fetchMock = jest.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ error: { message: 'Service unavailable' } }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      ))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: responseText }] } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    const context: MissJulieContext = {
      studentName: 'Aarav',
      grade: 4,
      levelTitle: 'Talkora Adventure',
      lessonTitle: 'English Practice',
      recentMistakes: [],
      memoryFacts: [],
      promptContext: 'conversation',
      studentMessage: 'I went to the zoo yesterday.',
    }

    try {
      const result = await new GeminiConversationProvider().generate(context)

      expect(result.followUpQuestion).toBe('Which animal did you like best?')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
      env.geminiApiKey = previousApiKey
      env.geminiModel = previousModel
      env.geminiFallbackModel = previousFallbackModel
    }
  })

  it('retries malformed generated JSON and accepts the next valid Gemini response', async () => {
    const previousApiKey = env.geminiApiKey
    const previousModel = env.geminiModel
    const previousFallbackModel = env.geminiFallbackModel
    env.geminiApiKey = 'test-gemini-key'
    env.geminiModel = 'gemini-test-model'
    env.geminiFallbackModel = ''

    const validResponse = JSON.stringify({
      message: 'You visited the zoo yesterday.',
      emotion: 'encouraging',
      responseQuality: 'ADEQUATE',
      corrections: [],
      correction: { needed: false, original: '', corrected: '', explanation: '' },
      hint: null,
      followUpQuestion: 'Which animal did you like best?',
      memoryUpdates: [],
      teachingAction: 'ASK_FOLLOW_UP',
      modelSentence: null,
      shouldRetry: false,
      hintLevel: 0,
    })
    const fetchMock = jest.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{
          finishReason: 'MAX_TOKENS',
          content: { parts: [{ text: '{"message":"You visited' }] },
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: validResponse }] } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    const context: MissJulieContext = {
      studentName: 'Aarav',
      grade: 4,
      levelTitle: 'Talkora Adventure',
      lessonTitle: 'English Practice',
      recentMistakes: [],
      memoryFacts: [],
      promptContext: 'conversation',
      studentMessage: 'I went to the zoo yesterday.',
    }

    try {
      const result = await new GeminiConversationProvider().generate(context)

      expect(result.followUpQuestion).toBe('Which animal did you like best?')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
      env.geminiApiKey = previousApiKey
      env.geminiModel = previousModel
      env.geminiFallbackModel = previousFallbackModel
    }
  })
})
