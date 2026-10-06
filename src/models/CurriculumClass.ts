import { Schema, model, Document, Types } from 'mongoose'

/** Represents a school grade (Class 4-10), not a JS class — named CurriculumClass to avoid confusion. */
export interface ICurriculumClass extends Document {
  _id: Types.ObjectId
  grade: number
  name: string
  description?: string
  order: number
  status: 'active' | 'draft'
  createdAt: Date
  updatedAt: Date
}

const curriculumClassSchema = new Schema<ICurriculumClass>(
  {
    grade: { type: Number, required: true, unique: true, min: 4, max: 10 },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    order: { type: Number, required: true },
    status: { type: String, enum: ['active', 'draft'], default: 'active' },
  },
  { timestamps: true },
)

export const CurriculumClass = model<ICurriculumClass>('CurriculumClass', curriculumClassSchema)
