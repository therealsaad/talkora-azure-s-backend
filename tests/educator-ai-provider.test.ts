import { afterEach, expect, test } from '@jest/globals'
import { env } from '../src/config/env'
import { askEducatorGemini } from '../src/providers/ai/EducatorGeminiProvider'

const originalFetch = globalThis.fetch
const originalGeminiKey = env.geminiApiKey
const originalGeminiModel = env.geminiModel

afterEach(() => {
  globalThis.fetch = originalFetch
  env.geminiApiKey = originalGeminiKey
  env.geminiModel = originalGeminiModel
})

test('educator assistant sends general questions to Gemini using the server key and model', async () => {
  env.geminiApiKey = 'test-gemini-key'
  env.geminiModel = 'gemini-flash-latest'

  let requestUrl = ''
  let requestInit: RequestInit | undefined
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input)
    requestInit = init
    return new Response(JSON.stringify({
      candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify({
          summary: 'Talkora helps educators support student learning.',
          insights: [],
          actions: [],
          followUpSuggestions: [],
        }) }] } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  const response = await askEducatorGemini('What is Talkora for?', { scope: 'school' })

  expect(requestUrl).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent')
  expect((requestInit?.headers as Record<string, string>)['X-goog-api-key']).toBe('test-gemini-key')
  const payload = JSON.parse(String(requestInit?.body))
  expect(payload.generationConfig.responseMimeType).toBe('application/json')
  expect(payload.systemInstruction.parts[0].text).toContain('general questions')
  expect(JSON.parse(payload.contents[0].parts[0].text)).toMatchObject({ request: 'What is Talkora for?', authorizedAnalytics: { scope: 'school' } })
  expect(response.summary).toBe('Talkora helps educators support student learning.')
})

test('educator assistant reports Gemini quota exhaustion clearly', async () => {
  env.geminiApiKey = 'test-gemini-key'
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded.' },
  }), { status: 429, headers: { 'content-type': 'application/json' } })

  await expect(askEducatorGemini('Explain a lesson plan.', {})).rejects.toMatchObject({
    statusCode: 429,
    message: expect.stringContaining('Gemini API quota'),
  })
})

test('educator assistant falls back to the stable Gemini Flash model after transient 503 errors', async () => {
  env.geminiApiKey = 'test-gemini-key'
  env.geminiModel = 'gemini-flash-latest'

  const requestUrls: string[] = []
  globalThis.fetch = async (input) => {
    const requestUrl = String(input)
    requestUrls.push(requestUrl)
    if (requestUrls.length <= 2) {
      return new Response(JSON.stringify({
        error: { code: 503, status: 'UNAVAILABLE', message: 'This model is experiencing high demand.' },
      }), { status: 503, headers: { 'content-type': 'application/json' } })
    }

    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        summary: 'AI learns patterns from examples.',
        insights: [],
        actions: [],
        followUpSuggestions: [],
      }) }] } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  const response = await askEducatorGemini('How does AI work?', {})

  expect(requestUrls).toEqual([
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
  ])
  expect(response.summary).toBe('AI learns patterns from examples.')
})
