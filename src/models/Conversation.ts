import { Schema, model, Document, Types } from 'mongoose'

export interface IConversationMessage {
  role: 'student' | 'missJulie'
  content: string
  emotion?: string
  createdAt: Date
  inputMode?: 'OPTION' | 'MIC' | 'TEXT'
}

export interface IConversation extends Document {
  _id: Types.ObjectId
  studentId: Types.ObjectId
  lessonId?: Types.ObjectId
  activityId?: Types.ObjectId
  messages: IConversationMessage[]
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  turnCount: number
  goalState: string[]
  skillEvidence: Array<{
    skill: string
    support: 'INDEPENDENT' | 'SUPPORTED'
    utterance: string
    turn: number
  }>
  retryState?: {
    waiting: boolean
    targetSkill: string
    attempt: number
    hintLevel: number
    originalUtterance: string
    modelSentence?: string
  }
  masteryStatus: 'IN_PROGRESS' | 'MASTERED' | 'COMPLETED_WITH_SUPPORT' | 'NEEDS_PRACTICE'
  summary?: string
  mode?: 'FREE_TALK' | 'LESSON' | 'PRACTICE'
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const conversationMessageSchema = new Schema<IConversationMessage>(
  {
    role: { type: String, enum: ['student', 'missJulie'], required: true },
    content: { type: String, required: true },
    emotion: { type: String },
    createdAt: { type: Date, default: Date.now },
    inputMode: { type: String, enum: ['OPTION', 'MIC', 'TEXT'] },
  },
  { _id: false },
)

const conversationSchema = new Schema<IConversation>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity' },
    messages: [conversationMessageSchema],
    status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'], default: 'ACTIVE', index: true },
    turnCount: { type: Number, default: 0 },
    goalState: { type: [String], default: [] },
    skillEvidence: [{
      _id: false,
      skill: { type: String, required: true },
      support: { type: String, enum: ['INDEPENDENT', 'SUPPORTED'], required: true },
      utterance: { type: String, required: true },
      turn: { type: Number, required: true },
    }],
    retryState: {
      waiting: { type: Boolean, default: false },
      targetSkill: { type: String, default: '' },
      attempt: { type: Number, default: 0 },
      hintLevel: { type: Number, default: 0 },
      originalUtterance: { type: String, default: '' },
      modelSentence: { type: String },
    },
    masteryStatus: { type: String, enum: ['IN_PROGRESS', 'MASTERED', 'COMPLETED_WITH_SUPPORT', 'NEEDS_PRACTICE'], default: 'IN_PROGRESS' },
    summary: { type: String, trim: true, maxlength: 1000 },
    mode: { type: String, enum: ['FREE_TALK', 'LESSON', 'PRACTICE'], default: 'FREE_TALK' },
    completedAt: Date,
  },
  { timestamps: true },
)

conversationSchema.index({ studentId: 1, activityId: 1, status: 1 })
conversationSchema.index({ studentId: 1, status: 1, updatedAt: -1 })

export const Conversation = model<IConversation>('Conversation', conversationSchema)
