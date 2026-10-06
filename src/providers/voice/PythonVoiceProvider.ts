import { env } from '../../config/env'
import {
  VoicePrewarmResult,
  VoiceProvider,
  VoiceStreamResult,
  VoiceSynthesisResult,
} from './VoiceProvider'
import { ApiError } from '../../utils/ApiError'

const PRIYA_LANGUAGE = 'en-IN'

export class PythonVoiceProvider implements VoiceProvider {
  name = 'python-priya'

  async synthesize(text: string): Promise<VoiceSynthesisResult> {
    const stream = await this.synthesizeStream(text)
    const reader = stream.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0

    while (true) {
      const next = await reader.read()
      if (next.done) break
      chunks.push(next.value)
      total += next.value.byteLength
    }
    reader.releaseLock()

    const bytes = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }

    return {
      audioUrl: null,
      audioBase64: Buffer.from(bytes).toString('base64'),
      contentType: stream.contentType,
      available: bytes.byteLength > 0,
      provider: this.name,
    }
  }

  async synthesizeStream(text: string): Promise<VoiceStreamResult> {
    const startedAt = Date.now()
    if (process.env.NODE_ENV !== 'production') {
      console.info('VOICE_REQUEST', { characters: text.length })
    }
    console.info('VOICE_PROVIDER', { provider: this.name })

    let response: Response
    try {
      response = await fetch(
        `${env.aiServiceUrl.replace(/\/$/, '')}/v1/tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(env.aiServiceApiKey ? { 'X-Service-API-Key': env.aiServiceApiKey } : {}),
          },
          body: JSON.stringify({
            text,
            voice: env.ttsVoiceId,
            language: PRIYA_LANGUAGE,
          }),
          signal: AbortSignal.timeout(env.ttsTimeoutMs),
        },
      )
    } catch (error) {
      console.error('VOICE_ERROR', {
        provider: this.name,
        reason: error instanceof Error ? error.name : 'request_failed',
      })
      throw ApiError.provider('TTS_SERVICE_UNAVAILABLE')
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error('VOICE_ERROR', {
        provider: this.name,
        status: response.status,
        detail: detail.slice(0, 500),
      })
      throw ApiError.provider(
        response.status === 503
          ? 'TTS_GENERATION_FAILED'
          : 'TTS_SERVICE_UNAVAILABLE',
      )
    }

    const metadata: Record<string, string> = {}
    for (const header of [
      'x-talkora-audio-hash',
      'x-talkora-cache',
      'x-talkora-cache-key',
      'x-talkora-tts-source',
      'x-talkora-tts-latency-ms',
      'x-talkora-audio-duration-seconds',
      'x-talkora-voice-id',
      'x-talkora-tts-phases',
    ]) {
      const value = response.headers.get(header)
      if (value) metadata[header] = value
    }

    const body = response.body
    if (!body) throw ApiError.provider('TTS_GENERATION_FAILED')

    console.info('VOICE_CACHE_HIT', {
      hit: metadata['x-talkora-cache'] === 'HIT',
    })
    console.info('VOICE_GENERATION_MS', {
      milliseconds: Date.now() - startedAt,
    })

    return {
      body,
      contentType: response.headers.get('content-type') || 'audio/wav',
      provider: this.name,
      metadata,
    }
  }

  async prewarm(texts: string[]): Promise<VoicePrewarmResult> {
    const unique = [...new Set(texts.map((text) => text.trim()).filter(Boolean))]
    if (!unique.length) {
      return { accepted: 0, pending: 0, provider: this.name }
    }

    let accepted = 0
    let pending = 0

    // Keep requests comfortably below FastAPI/Pydantic body limits and allow
    // future curricula to contain many more lines.
    for (let offset = 0; offset < unique.length; offset += 200) {
      const batch = unique.slice(offset, offset + 200)
      try {
        const response = await fetch(
          `${env.aiServiceUrl.replace(/\/$/, '')}/v1/tts/prewarm`,
          {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            ...(env.aiServiceApiKey ? { 'X-Service-API-Key': env.aiServiceApiKey } : {}),
          },
            body: JSON.stringify({
              texts: batch,
              voice: env.ttsVoiceId,
              language: PRIYA_LANGUAGE,
            }),
            // /prewarm only queues work and should answer quickly.
            signal: AbortSignal.timeout(Math.min(env.ttsTimeoutMs, 10000)),
          },
        )

        if (!response.ok) {
          const detail = await response.text().catch(() => '')
          console.warn('VOICE_PREWARM_FAILED', {
            status: response.status,
            detail: detail.slice(0, 300),
          })
          continue
        }

        const result = (await response.json()) as {
          accepted?: number
          pending?: number
        }
        accepted += Number(result.accepted ?? 0)
        pending = Number(result.pending ?? pending)
      } catch (error) {
        console.warn('VOICE_PREWARM_FAILED', {
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { accepted, pending, provider: this.name }
  }
}
