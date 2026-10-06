import { Schema, model, Document, Types } from 'mongoose'

export interface ITeacher extends Document {
  _id: Types.ObjectId
  schoolId: Types.ObjectId
  name: string
  email: string
  passwordHash: string
  role: 'TEACHER'
  status: 'active' | 'suspended'
  createdAt: Date
  updatedAt: Date
}

const teacherSchema = new Schema<ITeacher>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['TEACHER'], default: 'TEACHER' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  },
  { timestamps: true },
)

// Email is unique per school, not globally — two schools may each have a teacher with the same email.
teacherSchema.index({ schoolId: 1, email: 1 }, { unique: true })

export const Teacher = model<ITeacher>('Teacher', teacherSchema)
