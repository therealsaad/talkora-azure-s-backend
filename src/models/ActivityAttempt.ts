import { Schema, model, Document, Types } from 'mongoose'

export interface IActivityAttempt extends Document {
  _id: Types.ObjectId
  studentId: Types.ObjectId
  activityId: Types.ObjectId
  lessonId: Types.ObjectId
  levelId: Types.ObjectId
  classId: Types.ObjectId
  answer: string
  normalizedAnswer: string
  correct: boolean
  score: number // 0-100, backend-computed
  attemptNumber: number
  startedAt: Date
  submittedAt: Date
  timeTakenMs: number
  hintsUsed: number
  feedback?: string
  idempotencyKey?: string
  createdAt: Date
}

const activityAttemptSchema = new Schema<IActivityAttempt>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    levelId: { type: Schema.Types.ObjectId, ref: 'Level', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'CurriculumClass', required: true },
    answer: { type: String, required: true },
    normalizedAnswer: { type: String, required: true },
    correct: { type: Boolean, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    attemptNumber: { type: Number, required: true, min: 1 },
    startedAt: { type: Date, required: true },
    submittedAt: { type: Date, required: true },
    timeTakenMs: { type: Number, required: true, min: 0 },
    hintsUsed: { type: Number, default: 0 },
    feedback: { type: String },
    idempotencyKey: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

// Prevents the exact same client-submitted attempt from being double-processed/double-XP'd.
activityAttemptSchema.index({ studentId: 1, idempotencyKey: 1 }, { unique: true, sparse: true })
activityAttemptSchema.index({ studentId: 1, activityId: 1, attemptNumber: 1 }, { unique: true })
activityAttemptSchema.index({ studentId: 1, createdAt: -1 })

export const ActivityAttempt = model<IActivityAttempt>('ActivityAttempt', activityAttemptSchema)
