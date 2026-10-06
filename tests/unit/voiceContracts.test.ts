import { submitVoiceTranscriptSchema, transcribeVoiceSchema } from '../../src/schemas/voice.schema'
import { PythonSpeechProvider } from '../../src/providers/speech/PythonSpeechProvider'
import { AzureSpeechProvider } from '../../src/providers/speech/AzureSpeechProvider'
import { env } from '../../src/config/env'

describe('voice request contracts', () => {
  it('does not accept client-authoritative expected pronunciation text', () => {
    const result = submitVoiceTranscriptSchema.safeParse({
      params: { sessionId: 'session-1' },
      body: { transcript: 'tree', expected: 'tree' },
    })
    expect(result.success).toBe(false)
  })

  it('accepts bounded recording metadata', () => {
    const result = transcribeVoiceSchema.safeParse({
      body: { audioBase64: 'AAAA', mimeType: 'audio/webm;codecs=opus', durationMs: 1200 },
    })
    expect(result.success).toBe(true)
  })

  it('rejects recordings outside the student speaking limit', () => {
    const result = transcribeVoiceSchema.safeParse({
      body: { audioBase64: 'AAAA', mimeType: 'audio/webm', durationMs: 12000 },
    })
    expect(result.success).toBe(false)
  })

  it('forwards a MIME-matched filename to faster-whisper', async () => {
    const originalFetch = global.fetch
    let sentFile: File | null = null
    global.fetch = jest.fn(async (_url, options) => {
      sentFile = (options?.body as FormData).get('audio') as File
      return new Response(JSON.stringify({ transcript: 'Hello Miss Julie' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }) as typeof fetch

    try {
      await new PythonSpeechProvider().transcribe({
        audioBase64: Buffer.from('wav-bytes').toString('base64'),
        mimeType: 'audio/wav',
      })
      expect((sentFile as File | null)?.name).toBe('student-speech.wav')
      expect((sentFile as File | null)?.type).toBe('audio/wav')
    } finally {
      global.fetch = originalFetch
    }
  })

  it('sends browser WebM audio to Azure fast transcription and returns its transcript', async () => {
    const originalFetch = global.fetch
    const originalKey = env.azureSpeechKey
    const originalRegion = env.azureSpeechRegion
    const originalLocale = env.azureSpeechSttLocale
    let requestUrl = ''
    let requestOptions: RequestInit | undefined

    env.azureSpeechKey = 'azure-test-key'
    env.azureSpeechRegion = 'centralindia'
    env.azureSpeechSttLocale = 'en-IN'
    global.fetch = jest.fn(async (input, options) => {
      requestUrl = String(input)
      requestOptions = options
      return new Response(JSON.stringify({ combinedPhrases: [{ text: 'Hello Miss Julie.' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }) as typeof fetch

    try {
      const result = await new AzureSpeechProvider().transcribe({
        audioBase64: Buffer.from('webm-audio').toString('base64'),
        mimeType: 'audio/webm;codecs=opus',
        durationMs: 1200,
      })
      const form = requestOptions?.body as FormData
      const audio = form.get('audio') as File

      expect(requestUrl).toBe(
        'https://centralindia.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15',
      )
      expect((requestOptions?.headers as Record<string, string>)['Ocp-Apim-Subscription-Key']).toBe('azure-test-key')
      expect(audio.name).toBe('student-speech.webm')
      expect(audio.type).toBe('audio/webm')
      expect(form.get('definition')).toBe(JSON.stringify({ locales: ['en-IN'] }))
      expect(result).toMatchObject({
        transcript: 'Hello Miss Julie.',
        available: true,
        provider: 'azure-speech',
      })
    } finally {
      global.fetch = originalFetch
      env.azureSpeechKey = originalKey
      env.azureSpeechRegion = originalRegion
      env.azureSpeechSttLocale = originalLocale
    }
  })
})
