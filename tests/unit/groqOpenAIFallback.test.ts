import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { env } from '../../src/config/env'
import { OpenAIProvider } from '../../src/providers/ai/OpenAIProvider'
import { GroqProvider } from '../../src/providers/ai/GroqProvider'
import type { MissJulieContext } from '../../src/providers/ai/AIProvider'

describe('Groq conversation fallback', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('uses the configured OpenAI brain when Groq rejects its API key', async () => {
    const previousGroqKey = env.groqApiKey
    const previousOpenAIKey = env.openaiApiKey
    env.groqApiKey = 'test-groq-key'
    env.openaiApiKey = 'test-openai-key'

    const groqResponse = new Response(
      JSON.stringify({ error: { message: 'Invalid API Key', code: 'invalid_api_key' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(groqResponse)
    const fallback = jest.spyOn(OpenAIProvider.prototype, 'generate').mockResolvedValue({
      message: 'That sounds fun! What do you like to read?',
      emotion: 'curious',
      corrections: [],
      followUpQuestion: null,
      memoryUpdates: [],
      xpAwarded: 0,
    })

    const context: MissJulieContext = {
      studentName: 'Aarav',
      grade: 4,
      levelTitle: 'Talkora Adventure',
      lessonTitle: 'English Practice',
      recentMistakes: [],
      memoryFacts: [],
      promptContext: 'conversation',
      studentMessage: 'I like reading stories.',
      conversationHistory: [
        'missJulie: What do you like doing?',
        'student: I like reading stories.',
      ],
    }

    try {
      const response = await new GroqProvider().generate(context)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fallback).toHaveBeenCalledWith(context)
      expect(response.message).toContain('What do you like to read')
    } finally {
      env.groqApiKey = previousGroqKey
      env.openaiApiKey = previousOpenAIKey
    }
  })
})
