import { Schema, model, Document, Types } from 'mongoose'

export interface IStudentMemory extends Document {
  _id: Types.ObjectId
  studentId: Types.ObjectId
  key?: string
  value?: string
  category: 'preference' | 'vocabulary' | 'grammar' | 'pronunciation' | 'speaking' | 'behavior'
  fact: string
  confidence: number // 0-1
  timesObserved: number
  lastReinforcedAt: Date
  source: 'ai' | 'system' | 'teacher'
  sourceActivityId?: Types.ObjectId
  sourceConversationId?: Types.ObjectId
  sourceTurn?: number
  sourceTranscript?: string
  firstLearnedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const studentMemorySchema = new Schema<IStudentMemory>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    key: { type: String, trim: true },
    value: { type: String, trim: true, maxlength: 80 },
    category: { type: String, enum: ['preference', 'vocabulary', 'grammar', 'pronunciation', 'speaking', 'behavior'], required: true },
    fact: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1, default: 0.5 },
    timesObserved: { type: Number, default: 1 },
    lastReinforcedAt: { type: Date, default: Date.now },
    source: { type: String, enum: ['ai', 'system', 'teacher'], default: 'ai' },
    sourceActivityId: { type: Schema.Types.ObjectId, ref: 'Activity' },
    sourceConversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    sourceTurn: { type: Number, min: 1 },
    sourceTranscript: { type: String, trim: true, maxlength: 500 },
    firstLearnedAt: { type: Date },
  },
  { timestamps: true },
)

studentMemorySchema.index({ studentId: 1, category: 1 })
studentMemorySchema.index({ studentId: 1, key: 1 }, { unique: true, partialFilterExpression: { key: { $type: 'string' } } })

export const StudentMemory = model<IStudentMemory>('StudentMemory', studentMemorySchema)
