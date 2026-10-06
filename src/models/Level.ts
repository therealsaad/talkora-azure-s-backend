import { Schema, model, Document, Types } from 'mongoose'

export interface ILevel extends Document {
  _id: Types.ObjectId
  classId: Types.ObjectId
  number: number
  term: 1 | 2
  unitNumber: number
  unitType: 'CONVERSATION' | 'PRESENTATION' | 'ROLEPLAY' | 'STORY_NARRATIVE'
  visualTheme: string
  learningObjectives: string[]
  speakingGoals: string[]
  badge?: { key: string; title: string; description: string; icon?: string }
  sourceBook?: string
  sourcePages: number[]
  curriculumVersion: string
  availability: 'PUBLISHED' | 'UPCOMING' | 'ARCHIVED'
  title: string
  place: string // the "world" location shown on the map, e.g. "Classroom", "Beach"
  description?: string
  order: number
  icon?: string
  requiredLevelId?: Types.ObjectId // level that must be completed to unlock this one
  status: 'active' | 'draft'
  createdAt: Date
  updatedAt: Date
}

const levelSchema = new Schema<ILevel>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'CurriculumClass', required: true, index: true },
    number: { type: Number, required: true },
    term: { type: Number, enum: [1, 2], required: true, default: 1 },
    unitNumber: { type: Number, min: 1, max: 8, required: true, default: 1 },
    unitType: { type: String, enum: ['CONVERSATION', 'PRESENTATION', 'ROLEPLAY', 'STORY_NARRATIVE'], required: true, default: 'CONVERSATION' },
    visualTheme: { type: String, required: true, default: 'Talkora World' },
    learningObjectives: { type: [String], default: [] },
    speakingGoals: { type: [String], default: [] },
    badge: { key: String, title: String, description: String, icon: String },
    sourceBook: { type: String },
    sourcePages: { type: [Number], default: [] },
    curriculumVersion: { type: String, required: true, default: 'talkora-syllabus-v1' },
    availability: { type: String, enum: ['PUBLISHED', 'UPCOMING', 'ARCHIVED'], default: 'PUBLISHED', index: true },
    title: { type: String, required: true, trim: true },
    place: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    order: { type: Number, required: true },
    icon: { type: String },
    requiredLevelId: { type: Schema.Types.ObjectId, ref: 'Level' },
    status: { type: String, enum: ['active', 'draft'], default: 'active' },
  },
  { timestamps: true },
)

levelSchema.index({ classId: 1, number: 1 }, { unique: true })
levelSchema.index({ classId: 1, order: 1 })

export const Level = model<ILevel>('Level', levelSchema)
