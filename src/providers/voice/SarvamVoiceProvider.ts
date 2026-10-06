import { env } from '../../config/env'
import { ApiError } from '../../utils/ApiError'
import { VoiceProvider, VoiceStreamResult, VoiceSynthesisResult } from './VoiceProvider'

const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech/streaming'
const MAX_TEXT_LENGTH = 2000

function assertText(text: string): string {
  const normalized = text.trim()
  if (!normalized) throw ApiError.badRequest('text is required')
  if (normalized.length > MAX_TEXT_LENGTH) throw ApiError.badRequest('text is too long')
  return normalized
}

function providerError(status: number): ApiError {
  if (status === 401 || status === 403) return ApiError.provider('Voice provider is not configured')
  if (status === 429) return ApiError.provider('Voice service is busy. Please try again shortly.')
  return ApiError.provider('Voice service is temporarily unavailable')
}

export class SarvamVoiceProvider implements VoiceProvider {
  name = 'sarvam'

  private request(text: string, signal: AbortSignal) {
    if (!env.sarvamApiKey) throw ApiError.provider('Voice provider is not configured')
    return fetch(SARVAM_TTS_URL, {
      method: 'POST',
      headers: {
        'api-subscription-key': env.sarvamApiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/wav',
      },
      body: JSON.stringify({
        text,
        target_language_code: env.sarvamTtsLanguage,
        speaker: env.sarvamTtsSpeaker,
        model: env.sarvamTtsModel,
        pace: env.sarvamTtsPace,
        temperature: env.sarvamTtsTemperature,
      }),
      signal,
    })
  }

  async synthesizeStream(text: string): Promise<VoiceStreamResult> {
    const normalized = assertText(text)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), env.sarvamTimeoutMs)
    try {
      const response = await this.request(normalized, controller.signal)
      const contentType = response.headers.get('content-type') || ''
      if (!response.ok) throw providerError(response.status)
      if (!response.body || !contentType.startsWith('audio/')) throw ApiError.provider('Voice provider returned an invalid audio response')
      return { body: response.body, contentType, provider: this.name }
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (error instanceof Error && error.name === 'AbortError') throw ApiError.provider('Voice service timed out')
      throw ApiError.provider('Voice service is temporarily unavailable')
    } finally {
      clearTimeout(timeout)
    }
  }

  async synthesize(text: string): Promise<VoiceSynthesisResult> {
    const stream = await this.synthesizeStream(text)
    const reader = stream.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    try {
      while (true) {
        const next = await reader.read()
        if (next.done) break
        chunks.push(next.value)
        total += next.value.byteLength
      }
    } finally {
      reader.releaseLock()
    }
    const audio = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) { audio.set(chunk, offset); offset += chunk.byteLength }
    return { audioUrl: null, audioBase64: Buffer.from(audio).toString('base64'), contentType: stream.contentType, available: true, provider: this.name }
  }
}