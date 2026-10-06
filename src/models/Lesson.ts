import { Schema, model, Document, Types } from 'mongoose'

export interface ILesson extends Document {
  _id: Types.ObjectId
  levelId: Types.ObjectId
  title: string
  subtitle?: string
  order: number
  estimatedMinutes: number
  xpReward: number
  teacherIntroduction?: string
  settings?: Record<string, unknown>
  status: 'active' | 'draft'
  createdAt: Date
  updatedAt: Date
}

const lessonSchema = new Schema<ILesson>(
  {
    levelId: { type: Schema.Types.ObjectId, ref: 'Level', required: true, index: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    order: { type: Number, required: true },
    estimatedMinutes: { type: Number, default: 8 },
    xpReward: { type: Number, default: 50 },
    teacherIntroduction: { type: String },
    settings: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['active', 'draft'], default: 'active' },
  },
  { timestamps: true },
)

lessonSchema.index({ levelId: 1, order: 1 })

export const Lesson = model<ILesson>('Lesson', lessonSchema)
