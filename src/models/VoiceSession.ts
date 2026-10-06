import { Schema, model, Document, Types } from 'mongoose'

export interface IVoiceSession extends Document {
  _id: Types.ObjectId
  studentId: Types.ObjectId
  lessonId?: Types.ObjectId
  activityId?: Types.ObjectId
  startedAt: Date
  endedAt?: Date
  duration?: number
  transcript?: string
  evaluation?: {
    score: number
    feedback: string
    correctWords?: string[]
    wrongWords?: string[]
    missingWords?: string[]
    extraWords?: string[]
    wordOrderMatched?: boolean
    sentenceSimilarity?: number
    isAcousticPronunciationScore?: false
  }
  aiResponse?: unknown
  xpAwarded?: number
  conversationMode?: 'OPEN' | 'CONTROLLED'
  provider: string
  status: 'active' | 'completed' | 'failed' | 'cancelled'
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const voiceSessionSchema = new Schema<IVoiceSession>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity' },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    duration: { type: Number },
    // Raw audio is never persisted here — only the resulting transcript/evaluation.
    // If a future provider requires temporary audio storage, that belongs in a
    // separate, explicitly-documented, access-controlled store — not this collection.
    transcript: { type: String },
    evaluation: {
      score: { type: Number },
      feedback: { type: String },
      correctWords: { type: [String], default: undefined },
      wrongWords: { type: [String], default: undefined },
      missingWords: { type: [String], default: undefined },
      extraWords: { type: [String], default: undefined },
      wordOrderMatched: { type: Boolean },
      sentenceSimilarity: { type: Number },
      isAcousticPronunciationScore: { type: Boolean, default: false },
    },
    aiResponse: { type: Schema.Types.Mixed },
    xpAwarded: { type: Number, min: 0, default: 0 },
    conversationMode: { type: String, enum: ['OPEN', 'CONTROLLED'] },
    provider: { type: String, required: true },
    status: { type: String, enum: ['active', 'completed', 'failed', 'cancelled'], default: 'active' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
)

voiceSessionSchema.index({ studentId: 1, createdAt: -1 })

export const VoiceSession = model<IVoiceSession>('VoiceSession', voiceSessionSchema)
