import { Schema, model, Document, Types } from 'mongoose'

export interface ILessonProgress {
  lessonId: Types.ObjectId
  completedActivityIds: Types.ObjectId[]
  completed: boolean
  accuracy: number
  totalTimeMs: number
  completedAt?: Date
}

export interface ILevelProgress {
  levelId: Types.ObjectId
  status: 'locked' | 'unlocked' | 'in-progress' | 'completed'
  lessons: ILessonProgress[]
  accuracy: number
  totalTimeMs: number
  unlockedAt?: Date
  completedAt?: Date
}

export interface IProgress extends Document {
  _id: Types.ObjectId
  studentId: Types.ObjectId
  classId: Types.ObjectId
  curriculumVersion: string
  levels: ILevelProgress[]
  xp: number
  stars: number
  streak: number
  lastActivityAt?: Date
  updatedAt: Date
  createdAt: Date
}

const lessonProgressSchema = new Schema<ILessonProgress>(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    completedActivityIds: [{ type: Schema.Types.ObjectId, ref: 'Activity' }],
    completed: { type: Boolean, default: false },
    accuracy: { type: Number, default: 0 },
    totalTimeMs: { type: Number, default: 0 },
    completedAt: { type: Date },
  },
  { _id: false },
)

const levelProgressSchema = new Schema<ILevelProgress>(
  {
    levelId: { type: Schema.Types.ObjectId, ref: 'Level', required: true },
    status: { type: String, enum: ['locked', 'unlocked', 'in-progress', 'completed'], default: 'locked' },
    lessons: [lessonProgressSchema],
    accuracy: { type: Number, default: 0 },
    totalTimeMs: { type: Number, default: 0 },
    unlockedAt: { type: Date },
    completedAt: { type: Date },
  },
  { _id: false },
)

const progressSchema = new Schema<IProgress>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'CurriculumClass', required: true },
    curriculumVersion: { type: String, required: true, default: 'legacy' },
    levels: [levelProgressSchema],
    xp: { type: Number, default: 0 },
    stars: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastActivityAt: { type: Date },
  },
  { timestamps: true },
)

progressSchema.index({ studentId: 1, classId: 1 }, { unique: true })
progressSchema.index({ studentId: 1, 'levels.levelId': 1 })

export const Progress = model<IProgress>('Progress', progressSchema)
