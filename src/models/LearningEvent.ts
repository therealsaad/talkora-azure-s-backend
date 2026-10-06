import { Schema, model, Document, Types } from 'mongoose'

export const LEARNING_EVENT_TYPES = [
  'lesson_started',
  'activity_started',
  'activity_completed',
  'answer_submitted',
  'lesson_completed',
  'level_completed',
  'achievement_unlocked',
  'voice_session_started',
  'voice_session_completed',
  'speaking_attempt',
  'pronunciation_attempt',
  'login',
  'logout',
] as const

export type LearningEventType = (typeof LEARNING_EVENT_TYPES)[number]

export interface ILearningEvent extends Document {
  _id: Types.ObjectId
  studentId: Types.ObjectId
  type: LearningEventType
  lessonId?: Types.ObjectId
  levelId?: Types.ObjectId
  activityId?: Types.ObjectId
  metadata?: Record<string, unknown>
  createdAt: Date
}

const learningEventSchema = new Schema<ILearningEvent>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    type: { type: String, enum: LEARNING_EVENT_TYPES, required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    levelId: { type: Schema.Types.ObjectId, ref: 'Level' },
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

learningEventSchema.index({ studentId: 1, createdAt: -1 })

export const LearningEvent = model<ILearningEvent>('LearningEvent', learningEventSchema)
