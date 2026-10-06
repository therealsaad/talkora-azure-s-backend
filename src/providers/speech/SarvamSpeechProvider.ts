import { env } from '../../config/env'
import { ApiError } from '../../utils/ApiError'
import { SpeechRecognitionProvider } from './SpeechRecognitionProvider'

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text'

export class SarvamSpeechProvider implements SpeechRecognitionProvider {
  name = 'sarvam'

  async transcribe(input: { audioBase64: string; mimeType?: string; durationMs?: number }) {
    const audioBase64 = input.audioBase64
    if (!env.sarvamApiKey) throw ApiError.provider('Speech provider is not configured')
    if (!audioBase64 || audioBase64.length > 8_000_000) throw ApiError.badRequest('Audio payload is missing or too large')
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(audioBase64) || audioBase64.length % 4 !== 0) throw ApiError.badRequest('Audio payload is invalid')
    if (input.durationMs !== undefined && (input.durationMs < 250 || input.durationMs > 10_000)) throw ApiError.badRequest('Audio duration must be between 250ms and 10 seconds')
    const mimeType = input.mimeType && /^audio\/(webm|wav|ogg|mp4|mpeg)(;.*)?$/i.test(input.mimeType) ? input.mimeType.split(';')[0] : 'audio/webm'

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), env.sarvamTimeoutMs)
    try {
      const form = new FormData()
      const extension = mimeType.split('/')[1] === 'mpeg' ? 'mp3' : mimeType.split('/')[1]
      form.append('file', new Blob([Buffer.from(audioBase64, 'base64')], { type: mimeType }), `speech.${extension}`)
      form.append('model', env.sarvamSttModel)
      form.append('language_code', env.sarvamSttLanguage)
      const response = await fetch(SARVAM_STT_URL, {
        method: 'POST',
        headers: { 'api-subscription-key': env.sarvamApiKey },
        body: form,
        signal: controller.signal,
      })
      if (!response.ok) throw ApiError.provider('Speech service is temporarily unavailable')
      const payload = await response.json() as { transcript?: string }
      const transcript = payload.transcript?.trim() || null
      if (payload.transcript !== undefined && typeof payload.transcript !== 'string') throw ApiError.provider('Speech provider returned an invalid transcript')
      return { transcript, available: Boolean(transcript) }
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (error instanceof Error && error.name === 'AbortError') throw ApiError.provider('Speech service timed out')
      throw ApiError.provider('Speech service is temporarily unavailable')
    } finally {
      clearTimeout(timeout)
    }
  }
}