import { Schema, model, Document, Types } from 'mongoose'

export interface IDailyChallenge extends Document {
  _id: Types.ObjectId
  date: string // YYYY-MM-DD
  classId: Types.ObjectId
  title: string
  description?: string
  activityIds: Types.ObjectId[]
  xpReward: number
  createdAt: Date
  updatedAt: Date
}

const dailyChallengeSchema = new Schema<IDailyChallenge>(
  {
    date: { type: String, required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'CurriculumClass', required: true },
    title: { type: String, required: true },
    description: { type: String },
    activityIds: [{ type: Schema.Types.ObjectId, ref: 'Activity' }],
    xpReward: { type: Number, default: 25 },
  },
  { timestamps: true },
)

dailyChallengeSchema.index({ date: 1, classId: 1 }, { unique: true })

export const DailyChallenge = model<IDailyChallenge>('DailyChallenge', dailyChallengeSchema)
