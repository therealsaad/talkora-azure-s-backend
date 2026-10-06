import { env } from '../../config/env'
import { ApiError } from '../../utils/ApiError'
import { VoiceProvider, VoiceStreamResult, VoiceSynthesisResult } from './VoiceProvider'
import { logger } from '../../utils/logger'

const GROQ_SPEECH_URL = 'https://api.groq.com/openai/v1/audio/speech'

function speechChunks(text: string, limit: number): string[] {
  const chunks: string[] = []
  let current = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (word.length > limit) throw ApiError.provider('A conversation word exceeds the Groq TTS input limit')
    const next = current ? `${current} ${word}` : word
    if (next.length > limit) {
      chunks.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) chunks.push(current)
  return chunks
}

function wavPart(bytes: Uint8Array): { format: Uint8Array; samples: Uint8Array } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const label = (at: number) => String.fromCharCode(...bytes.subarray(at, at + 4))
  if (bytes.length < 44 || label(0) !== 'RIFF' || label(8) !== 'WAVE') {
    throw ApiError.provider('Groq returned invalid WAV audio')
  }
  let format: Uint8Array | undefined
  let samples: Uint8Array | undefined
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const size = view.getUint32(offset + 4, true)
    const start = offset + 8
    if (start + size > bytes.length) throw ApiError.provider('Groq returned incomplete WAV audio')
    if (label(offset) === 'fmt ') format = bytes.slice(start, start + size)
    if (label(offset) === 'data') samples = bytes.slice(start, start + size)
    offset = start + size + (size % 2)
  }
  if (!format || !samples) throw ApiError.provider('Groq returned WAV audio without samples')
  return { format, samples }
}

function joinWav(chunks: Uint8Array[]): Uint8Array {
  const parts = chunks.map(wavPart)
  const format = parts[0]!.format
  if (parts.some((part) => Buffer.compare(Buffer.from(part.format), Buffer.from(format)) !== 0)) {
    throw ApiError.provider('Groq returned incompatible WAV chunks')
  }
  const sampleLength = parts.reduce((sum, part) => sum + part.samples.length, 0)
  const formatPadding = format.length % 2
  const out = new Uint8Array(12 + 8 + format.length + formatPadding + 8 + sampleLength)
  const view = new DataView(out.buffer)
  out.set(Buffer.from('RIFF'), 0)
  view.setUint32(4, out.length - 8, true)
  out.set(Buffer.from('WAVEfmt '), 8)
  view.setUint32(16, format.length, true)
  out.set(format, 20)
  const dataOffset = 20 + format.length + formatPadding
  out.set(Buffer.from('data'), dataOffset)
  view.setUint32(dataOffset + 4, sampleLength, true)
  let cursor = dataOffset + 8
  for (const part of parts) {
    out.set(part.samples, cursor)
    cursor += part.samples.length
  }
  return out
}

export class GroqVoiceProvider implements VoiceProvider {
  name = 'groq-orpheus'

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
    const audio = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      audio.set(chunk, offset)
      offset += chunk.byteLength
    }
    return {
      audioUrl: null,
      audioBase64: Buffer.from(audio).toString('base64'),
      contentType: stream.contentType,
      available: true,
      provider: this.name,
    }
  }

  private conversationInput(text: string): string {
    const prefix = env.groqTtsVocalPrefix.trim()
    if (!prefix) return text
    if (text.startsWith('[')) return text
    return `${prefix} ${text}`.trim()
  }

  async synthesizeStream(text: string, options: { conversation?: boolean } = {}): Promise<VoiceStreamResult> {
    const normalized = text.trim()
    if (!normalized) throw ApiError.badRequest('text is required')
    if (!env.groqApiKey) throw ApiError.provider('Groq TTS is not configured')
    const spoken =
      options.conversation === false ? normalized : this.conversationInput(normalized)
    const chunks = speechChunks(spoken, Math.min(200, env.groqTtsMaxChars))
    const requestChunk = async (input: string): Promise<Response> => {
      try {
        return await fetch(GROQ_SPEECH_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.groqTtsModel,
          voice: env.groqTtsVoice,
          input,
          response_format: 'wav',
        }),
        signal: AbortSignal.timeout(env.ttsTimeoutMs),
        })
      } catch (error) {
        logger.warn('Groq TTS request failed', { error })
        throw ApiError.provider('TTS_SERVICE_UNAVAILABLE')
      }
    }
    const readChunk = async (response: Response): Promise<Uint8Array> => {
      if (!response.ok || !response.body) {
        const detail = await response.text().catch(() => '')
        logger.warn('Groq TTS returned an error', { status: response.status, detail: detail.slice(0, 300) })
        throw ApiError.provider('TTS_GENERATION_FAILED')
      }
      return new Uint8Array(await response.arrayBuffer())
    }
    // Confirm the first request succeeds before submitting more chunks. This also
    // avoids extra calls when an organization has not accepted Groq model terms.
    const first = await requestChunk(chunks[0]!)
    if (chunks.length === 1) {
      if (!first.ok || !first.body) await readChunk(first)
      return {
        body: first.body!,
        contentType: first.headers.get('content-type') || 'audio/wav',
        provider: this.name,
        metadata: { 'x-talkora-cache': 'MISS', 'x-talkora-voice-id': `${env.groqTtsModel}:${env.groqTtsVoice}` },
      }
    }
    const firstAudio = await readChunk(first)
    const rest = await Promise.all(chunks.slice(1).map(async (chunk) => readChunk(await requestChunk(chunk))))
    const audio = joinWav([firstAudio, ...rest])
    return {
      body: new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(audio); controller.close() } }),
      contentType: 'audio/wav',
      provider: this.name,
      metadata: {
        'x-talkora-cache': 'MISS',
        'x-talkora-voice-id': `${env.groqTtsModel}:${env.groqTtsVoice}`,
      },
    }
  }
}
