import crypto from 'crypto'
import { AudioCache } from '../models/AudioCache'
import { S3Service } from './S3Service'

export type AudioCacheIdentity = {
  text: string
  provider: string
  voice: string
  rate: string
  pitch: string
  format: string
  version?: string
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

export class AudioCacheService {
  static cacheKey(input: AudioCacheIdentity): string {
    const canonical = JSON.stringify({
      text: normalizeText(input.text),
      provider: input.provider,
      voice: input.voice,
      rate: input.rate,
      pitch: input.pitch,
      format: input.format,
      version: input.version || 'v1',
    })
    return crypto.createHash('sha256').update(canonical).digest('hex')
  }

  static async get(input: AudioCacheIdentity): Promise<{ audio: Buffer; contentType: string; cacheKey: string } | null> {
    const cacheKey = this.cacheKey(input)
    const record = await AudioCache.findOne({ cacheKey })
    if (!record) return null

    const audio = await S3Service.getAudio(record.s3Key)
    if (!audio) {
      await AudioCache.deleteOne({ _id: record._id })
      return null
    }

    record.hitCount = (record.hitCount || 0) + 1
    record.lastUsedAt = new Date()
    await record.save()

    return { audio, contentType: record.contentType || 'audio/wav', cacheKey }
  }

  static async put(
    input: AudioCacheIdentity,
    audio: Buffer,
    contentType = 'audio/wav',
  ): Promise<{ cacheKey: string; s3Key: string }> {
    const cacheKey = this.cacheKey(input)
    const s3Key = `tts/${input.provider}/${input.voice}/${cacheKey}.wav`

    await S3Service.putAudio(s3Key, audio, contentType)

    await AudioCache.findOneAndUpdate(
      { cacheKey },
      {
        $set: {
          text: normalizeText(input.text),
          provider: input.provider,
          voice: input.voice,
          rate: input.rate,
          pitch: input.pitch,
          format: input.format,
          contentType,
          s3Key,
          sizeBytes: audio.length,
          lastUsedAt: new Date(),
        },
        $setOnInsert: { hitCount: 0 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    return { cacheKey, s3Key }
  }
}
