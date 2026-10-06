import { ApiError } from '../../utils/ApiError'
import { logger } from '../../utils/logger'
import { AudioCacheService } from '../../services/AudioCacheService'
import type { VoiceProvider, VoiceStreamResult, VoiceSynthesisResult } from './VoiceProvider'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function streamFromBuffer(audio: Buffer): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(audio))
      controller.close()
    },
  })
}

export class AzureVoiceProvider implements VoiceProvider {
  name = 'azure-neerja'

  private settings() {
    return {
      key: process.env.AZURE_SPEECH_KEY?.trim() || '',
      region: process.env.AZURE_SPEECH_REGION?.trim() || 'centralindia',
      voice: process.env.AZURE_SPEECH_VOICE?.trim() || 'en-IN-NeerjaNeural',
      rate: process.env.AZURE_SPEECH_RATE?.trim() || '-8%',
      pitch: process.env.AZURE_SPEECH_PITCH?.trim() || '+2%',
      format: 'riff-24khz-16bit-mono-pcm',
      version: process.env.AZURE_VOICE_PROFILE_VERSION?.trim() || 'v1',
      timeoutMs: Number(process.env.TTS_TIMEOUT_MS || 30000),
    }
  }

  private async generate(text: string): Promise<Buffer> {
    const s = this.settings()
    if (!s.key) throw ApiError.provider('Azure Speech is not configured')

    const url = `https://${s.region}.tts.speech.microsoft.com/cognitiveservices/v1`
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-IN"><voice name="${s.voice}"><prosody rate="${s.rate}" pitch="${s.pitch}">${escapeXml(text)}</prosody></voice></speak>`

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': s.key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': s.format,
          'User-Agent': 'Talkora',
        },
        body: ssml,
        signal: AbortSignal.timeout(s.timeoutMs),
      })
    } catch (error) {
      logger.warn('Azure TTS request failed', { error })
      throw ApiError.provider('TTS_SERVICE_UNAVAILABLE')
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      logger.warn('Azure TTS returned an error', { status: response.status, detail: detail.slice(0, 300) })
      throw ApiError.provider('TTS_GENERATION_FAILED')
    }

    return Buffer.from(await response.arrayBuffer())
  }

  private identity(text: string) {
    const s = this.settings()
    return {
      text,
      provider: 'azure',
      voice: s.voice,
      rate: s.rate,
      pitch: s.pitch,
      format: s.format,
      version: s.version,
    }
  }

  async synthesize(text: string): Promise<VoiceSynthesisResult> {
    const normalized = text.trim()
    if (!normalized) throw ApiError.badRequest('text is required')

    const identity = this.identity(normalized)
    const cached = await AudioCacheService.get(identity)
    if (cached) {
      return {
        audioUrl: null,
        audioBase64: cached.audio.toString('base64'),
        contentType: cached.contentType,
        available: true,
        provider: this.name,
      }
    }

    const audio = await this.generate(normalized)
    await AudioCacheService.put(identity, audio, 'audio/wav')

    return {
      audioUrl: null,
      audioBase64: audio.toString('base64'),
      contentType: 'audio/wav',
      available: true,
      provider: this.name,
    }
  }

  async synthesizeStream(text: string): Promise<VoiceStreamResult> {
    const normalized = text.trim()
    if (!normalized) throw ApiError.badRequest('text is required')

    const identity = this.identity(normalized)
    const cached = await AudioCacheService.get(identity)
    if (cached) {
      return {
        body: streamFromBuffer(cached.audio),
        contentType: cached.contentType,
        provider: this.name,
        metadata: {
          'x-talkora-cache': 'HIT',
          'x-talkora-voice-id': this.settings().voice,
        },
      }
    }

    const audio = await this.generate(normalized)
    await AudioCacheService.put(identity, audio, 'audio/wav')

    return {
      body: streamFromBuffer(audio),
      contentType: 'audio/wav',
      provider: this.name,
      metadata: {
        'x-talkora-cache': 'MISS',
        'x-talkora-voice-id': this.settings().voice,
      },
    }
  }
}
