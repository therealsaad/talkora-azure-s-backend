import { env } from '../../config/env'
import { ApiError } from '../../utils/ApiError'
import { VoiceProvider, VoiceStreamResult, VoiceSynthesisResult } from './VoiceProvider'
import { logger } from '../../utils/logger'

export class IndicF5VoiceProvider implements VoiceProvider {
  name = 'indicf5'

  constructor(
    private readonly studentId?: string,
    private readonly language = 'hi-IN',
  ) {}

  async synthesize(text: string): Promise<VoiceSynthesisResult> {
    const stream = await this.synthesizeStream(text)
    const bytes = new Uint8Array(await new Response(stream.body).arrayBuffer())
    return {
      audioUrl: null,
      audioBase64: Buffer.from(bytes).toString('base64'),
      contentType: stream.contentType,
      available: true,
      provider: this.name,
    }
  }

  async synthesizeStream(text: string): Promise<VoiceStreamResult> {
    if (!env.indicf5ServiceUrl) throw ApiError.provider('IndicF5 is not configured')

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (env.indicf5ApiKey) headers['X-Talkora-TTS-Key'] = env.indicf5ApiKey

    let response: Response
    try {
      response = await fetch(`${env.indicf5ServiceUrl.replace(/\/$/, '')}/v1/tts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text, studentId: this.studentId, language: this.language }),
        signal: AbortSignal.timeout(env.indicf5TimeoutMs),
      })
    } catch (error) {
      logger.warn('IndicF5 TTS request failed', { error })
      throw ApiError.provider('TTS_SERVICE_UNAVAILABLE')
    }

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => '')
      logger.warn('IndicF5 TTS returned an error', { status: response.status, detail: detail.slice(0, 300) })
      throw ApiError.provider('TTS_GENERATION_FAILED')
    }

    const metadata: Record<string, string> = {}
    for (const header of ['x-talkora-audio-hash', 'x-talkora-cache', 'x-talkora-tts-latency-ms', 'x-talkora-voice-id']) {
      const value = response.headers.get(header)
      if (value) metadata[header] = value
    }

    return {
      body: response.body,
      contentType: response.headers.get('content-type') || 'audio/wav',
      provider: this.name,
      metadata,
    }
  }
}
