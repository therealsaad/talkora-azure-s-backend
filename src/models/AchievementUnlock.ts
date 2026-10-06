import { Schema, model, Document, Types } from 'mongoose'

export interface IAchievementUnlock extends Document {
  _id: Types.ObjectId
  studentId: Types.ObjectId
  achievementId: Types.ObjectId
  progress: number // 0-100, for partially-progressed achievements
  unlocked: boolean
  unlockedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const achievementUnlockSchema = new Schema<IAchievementUnlock>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    achievementId: { type: Schema.Types.ObjectId, ref: 'Achievement', required: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    unlocked: { type: Boolean, default: false },
    unlockedAt: { type: Date },
  },
  { timestamps: true },
)

achievementUnlockSchema.index({ studentId: 1, achievementId: 1 }, { unique: true })

export const AchievementUnlock = model<IAchievementUnlock>('AchievementUnlock', achievementUnlockSchema)
