import { env } from '../../config/env'
import { ApiError } from '../../utils/ApiError'
import { logger } from '../../utils/logger'
import { SpeechRecognitionProvider } from './SpeechRecognitionProvider'

const API_VERSION = '2024-11-15'

export class AzureSpeechProvider implements SpeechRecognitionProvider {
  name = 'azure-speech'

  async transcribe(input: {
    audioBase64: string
    mimeType?: string
    durationMs?: number
  }) {
    const key = env.azureSpeechKey.trim()
    if (!key) throw ApiError.provider('Azure Speech is not configured')

    const bytes = Buffer.from(input.audioBase64, 'base64')
    if (!bytes.length) throw ApiError.badRequest('Audio payload is empty')

    const mimeType = (input.mimeType || 'audio/webm').split(';', 1)[0].trim().toLowerCase()
    const extension = mimeType === 'audio/mpeg'
      ? 'mp3'
      : mimeType === 'audio/x-m4a'
        ? 'm4a'
        : mimeType.split('/')[1] || 'webm'
    const region = env.azureSpeechRegion.trim()
    const endpoint = `https://${region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=${API_VERSION}`
    const form = new FormData()
    form.append('audio', new Blob([bytes], { type: mimeType }), `student-speech.${extension}`)
    form.append('definition', JSON.stringify({ locales: [env.azureSpeechSttLocale] }))

    const startedAt = Date.now()
    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': key },
        body: form,
        signal: AbortSignal.timeout(env.sttTimeoutMs),
      })
    } catch (error) {
      logger.error('Azure STT request failed before response', {
        error: error instanceof Error ? error.message : String(error),
        region,
        mimeType,
        bytes: bytes.length,
        durationMs: input.durationMs,
      })
      throw ApiError.provider('STT_FAILED: unable to reach Azure Speech')
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      logger.error('Azure STT returned an error', {
        status: response.status,
        detail: detail.slice(0, 500),
        region,
        mimeType,
        bytes: bytes.length,
        durationMs: input.durationMs,
      })
      throw ApiError.provider(`STT_FAILED: Azure Speech returned ${response.status}`)
    }

    let result: unknown
    try {
      result = await response.json()
    } catch {
      throw ApiError.provider('STT_FAILED: invalid Azure Speech response')
    }

    const combinedPhrases = (result as { combinedPhrases?: unknown })?.combinedPhrases
    if (combinedPhrases !== undefined && !Array.isArray(combinedPhrases)) {
      throw ApiError.provider('STT_FAILED: invalid Azure Speech response')
    }

    const transcript = (combinedPhrases as Array<{ text?: unknown }> | undefined)
      ?.map((phrase) => typeof phrase.text === 'string' ? phrase.text.trim() : '')
      .filter(Boolean)
      .join(' ') || null

    logger.info('Azure STT completed', {
      provider: this.name,
      region,
      latencyMs: Date.now() - startedAt,
      transcriptLength: transcript?.length || 0,
    })

    return {
      transcript,
      available: true,
      latencyMs: Date.now() - startedAt,
      provider: this.name,
    }
  }
}
