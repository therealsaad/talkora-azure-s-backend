import mongoose, { Schema, InferSchemaType } from 'mongoose'

const AudioCacheSchema = new Schema(
  {
    cacheKey: { type: String, required: true, unique: true, index: true },
    text: { type: String, required: true },
    provider: { type: String, required: true, default: 'azure' },
    voice: { type: String, required: true },
    rate: { type: String, required: true },
    pitch: { type: String, required: true },
    format: { type: String, required: true, default: 'riff-24khz-16bit-mono-pcm' },
    contentType: { type: String, required: true, default: 'audio/wav' },
    s3Key: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    hitCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

export type AudioCacheDocument = InferSchemaType<typeof AudioCacheSchema>

export const AudioCache =
  mongoose.models.AudioCache || mongoose.model('AudioCache', AudioCacheSchema)
