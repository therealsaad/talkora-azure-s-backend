import { Schema, model, Document, Types } from 'mongoose'

export interface IMistakeRecord extends Document {
  _id: Types.ObjectId
  studentId: Types.ObjectId
  activityId?: Types.ObjectId
  lessonId?: Types.ObjectId
  type: string // e.g. activity type or 'conversation'
  skill: string // e.g. "pronunciation:TH", "grammar:irregular_verbs", "vocabulary"
  expected: string
  actual: string
  attemptCount: number
  resolved: boolean
  lastOccurredAt: Date
  createdAt: Date
  updatedAt: Date
}

const mistakeRecordSchema = new Schema<IMistakeRecord>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity' },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    type: { type: String, required: true, default: 'conversation' },
    skill: { type: String, required: true, index: true },
    expected: { type: String, required: true },
    actual: { type: String, required: true },
    attemptCount: { type: Number, default: 1 },
    resolved: { type: Boolean, default: false },
    lastOccurredAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
)

mistakeRecordSchema.index({ studentId: 1, skill: 1 })

export const MistakeRecord = model<IMistakeRecord>('MistakeRecord', mistakeRecordSchema)
