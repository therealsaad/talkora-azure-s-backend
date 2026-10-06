import { Schema, model, Document, Types } from 'mongoose'

export interface IAchievement extends Document {
  _id: Types.ObjectId
  key: string // stable machine key, e.g. "first-quest"
  title: string
  description: string
  category: 'learning' | 'speaking' | 'streak' | 'completion'
  icon?: string
  criteria: Record<string, unknown> // interpreted by AchievementService
  createdAt: Date
  updatedAt: Date
}

const achievementSchema = new Schema<IAchievement>(
  {
    key: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ['learning', 'speaking', 'streak', 'completion'], required: true },
    icon: { type: String },
    criteria: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
)

export const Achievement = model<IAchievement>('Achievement', achievementSchema)
