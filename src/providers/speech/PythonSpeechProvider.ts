import { env } from '../../config/env'
import { SpeechRecognitionProvider } from './SpeechRecognitionProvider'
import { ApiError } from '../../utils/ApiError'

export class PythonSpeechProvider implements SpeechRecognitionProvider {
  name = 'python-faster-whisper'

  async transcribe(input: { audioBase64: string; mimeType?: string }) {
    const startedAt = Date.now()
    const bytes = Buffer.from(input.audioBase64, 'base64')
    const mimeType = (input.mimeType || 'audio/webm').split(';', 1)[0].toLowerCase()
    const extensions: Record<string, string> = {
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/webm': 'webm',
    }
    const form = new FormData()
    form.append(
      'audio',
      new Blob([bytes], { type: mimeType }),
      `student-speech.${extensions[mimeType] || 'webm'}`,
    )

    let response: Response
    try {
      response = await fetch(
        `${env.aiServiceUrl.replace(/\/$/, '')}/v1/stt`,
        {
          method: 'POST',
          body: form,
          signal: AbortSignal.timeout(env.sttTimeoutMs),
        },
      )
    } catch (error) {
      console.error('STT_FAILED', {
        stage: 'fetch',
        elapsedMs: Date.now() - startedAt,
        timeoutMs: env.sttTimeoutMs,
        errorName: error instanceof Error ? error.name : 'unknown',
        reason: error instanceof Error ? error.message : 'request failed',
      })
      throw ApiError.provider("Miss Julie couldn't hear you right now. Please try again.", {
        providerCode: 'STT_UNAVAILABLE',
      })
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      let providerCode = 'STT_FAILED'
      try {
        providerCode = JSON.parse(detail)?.error?.code || providerCode
      } catch {
        // Keep a stable safe code for non-JSON provider responses.
      }
      console.error('STT_FAILED', {
        stage: 'response',
        elapsedMs: Date.now() - startedAt,
        status: response.status,
        detail: detail.slice(0, 240),
      })
      throw ApiError.provider("Miss Julie couldn't hear you right now. Please try again.", {
        providerCode,
      })
    }

    const result = (await response.json()) as {
      transcript?: string
      confidence?: number
      latencyMs?: number
      provider?: string
      model?: string
    }

    console.info('STT_OK', {
      elapsedMs: Date.now() - startedAt,
      status: response.status,
      provider: result.provider,
      model: result.model,
      transcriptLength: result.transcript?.trim().length || 0,
    })

    if (!result.transcript?.trim()) {
      throw ApiError.badRequest('No speech was detected. Please speak clearly and try again.')
    }

    return {
      transcript: result.transcript.trim(),
      available: true,
      confidence: result.confidence,
      latencyMs: result.latencyMs,
      provider: result.provider,
      model: result.model,
    }
  }
}
