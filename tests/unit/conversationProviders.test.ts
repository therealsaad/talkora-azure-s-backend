import { VoiceService } from '../../src/services/voice.service'
import { GroqSpeechProvider } from '../../src/providers/speech/GroqSpeechProvider'
import { GroqVoiceProvider } from '../../src/providers/voice/GroqVoiceProvider'
import { IndicF5VoiceProvider } from '../../src/providers/voice/IndicF5VoiceProvider'
import { PythonVoiceProvider } from '../../src/providers/voice/PythonVoiceProvider'
import { env } from '../../src/config/env'

describe('conversation speech routing', () => {
  it('serves fixed lesson speech from the Priya cache provider', async () => {
    const previousUrl = env.indicf5ServiceUrl
    const previousProvider = env.voiceProvider
    env.indicf5ServiceUrl = 'https://indicf5.example.test'
    env.voiceProvider = 'python'
    const cachedStream = {
      body: new ReadableStream<Uint8Array>(),
      contentType: 'audio/wav',
      provider: 'python-priya',
      metadata: { 'x-talkora-cache': 'HIT' },
    }
    const generatedStream = {
      body: new ReadableStream<Uint8Array>(),
      contentType: 'audio/wav',
      provider: 'indicf5',
      metadata: { 'x-talkora-cache': 'MISS' },
    }
    const python = jest.spyOn(PythonVoiceProvider.prototype, 'synthesizeStream').mockResolvedValue(cachedStream)
    const indic = jest.spyOn(IndicF5VoiceProvider.prototype, 'synthesizeStream').mockResolvedValue(generatedStream)
    try {
      await expect(VoiceService.streamSynthesize('Listen carefully.', { purpose: 'LESSON' }))
        .resolves.toMatchObject({ provider: 'python-priya', metadata: { 'x-talkora-cache': 'HIT' } })
    } finally {
      env.indicf5ServiceUrl = previousUrl
      env.voiceProvider = previousProvider
      python.mockRestore()
      indic.mockRestore()
    }
  })

  it('transcribes through Groq even when the legacy speech provider is configured', async () => {
    const transcribe = jest.spyOn(GroqSpeechProvider.prototype, 'transcribe').mockResolvedValue({
      transcript: 'I like cricket',
      available: true,
      provider: 'groq-whisper',
      model: 'whisper-large-v3',
      latencyMs: 1,
    })
    try {
      await expect(VoiceService.transcribeAudio({ audioBase64: 'dGVzdA==', mimeType: 'audio/webm' }))
        .resolves.toMatchObject({ transcript: 'I like cricket', provider: 'groq-whisper' })
      expect(transcribe).toHaveBeenCalledTimes(1)
    } finally {
      transcribe.mockRestore()
    }
  })

  it('uses Groq for conversation speech', async () => {
    const stream = { body: new ReadableStream<Uint8Array>(), contentType: 'audio/wav', provider: 'groq-orpheus' }
    const groq = jest.spyOn(GroqVoiceProvider.prototype, 'synthesizeStream').mockResolvedValue(stream)
    try {
      await expect(VoiceService.streamSynthesize('Hello!', { purpose: 'CONVERSATION' })).resolves.toBe(stream)
      expect(groq).toHaveBeenCalledWith('Hello!', { conversation: true })
    } finally {
      groq.mockRestore()
    }
  })

  it('tries Groq first for a conversation reply longer than 200 characters', async () => {
    const longReply = `I heard you. ${'Let us talk about your favourite game. '.repeat(7)}`
    const stream = { body: new ReadableStream<Uint8Array>(), contentType: 'audio/wav', provider: 'groq-orpheus' }
    const groq = jest.spyOn(GroqVoiceProvider.prototype, 'synthesizeStream').mockResolvedValue(stream)
    try {
      await expect(VoiceService.streamSynthesize(longReply, { purpose: 'CONVERSATION' })).resolves.toBe(stream)
      expect(groq).toHaveBeenCalledWith(longReply, { conversation: true })
    } finally {
      groq.mockRestore()
    }
  })

  it('does not fall back to lesson generation when Groq conversation speech fails', async () => {
    const previousUrl = env.indicf5ServiceUrl
    env.indicf5ServiceUrl = 'https://indicf5.example.test'
    const stream = { body: new ReadableStream<Uint8Array>(), contentType: 'audio/wav', provider: 'indicf5' }
    const groq = jest.spyOn(GroqVoiceProvider.prototype, 'synthesizeStream').mockRejectedValue(new Error('Groq unavailable'))
    const indic = jest.spyOn(IndicF5VoiceProvider.prototype, 'synthesizeStream').mockResolvedValue(stream)
    try {
      await expect(VoiceService.streamSynthesize('Hello!', { purpose: 'CONVERSATION' }))
        .rejects.toMatchObject({ code: 'PROVIDER_ERROR' })
    } finally {
      env.indicf5ServiceUrl = previousUrl
      groq.mockRestore()
      indic.mockRestore()
    }
  })

  it('reports unavailable conversation speech without using the lesson voice', async () => {
    const previousUrl = env.indicf5ServiceUrl
    env.indicf5ServiceUrl = ''
    const groq = jest.spyOn(GroqVoiceProvider.prototype, 'synthesizeStream').mockRejectedValue(new Error('Groq unavailable'))
    try {
      await expect(VoiceService.streamSynthesize('Hello!', { purpose: 'CONVERSATION' }))
        .rejects.toMatchObject({ code: 'PROVIDER_ERROR' })
    } finally {
      env.indicf5ServiceUrl = previousUrl
      groq.mockRestore()
    }
  })
})
