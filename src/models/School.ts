import { Schema, model, Document, Types } from 'mongoose'

export interface ISchool extends Document {
  _id: Types.ObjectId
  name: string
  code: string
  contactEmail?: string
  location?: string
  passwordHash: string
  status: 'active' | 'suspended'
  createdAt: Date
  updatedAt: Date
}

const schoolSchema = new Schema<ISchool>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    location: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  },
  { timestamps: true },
)

export const School = model<ISchool>('School', schoolSchema)
