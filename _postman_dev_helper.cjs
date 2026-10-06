// Temporary dev helper – queries DB, resets one student's code to a known value,
// and prints the three Postman environment variables.
// Safe to delete after use.
'use strict'

require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1) }

const KNOWN_CODE = 'DEMO'   // We will reset the chosen student to this code

async function run() {
  await mongoose.connect(MONGODB_URI)

  // ── 1. Find active school ──────────────────────────────────────────────────
  const schoolSchema = new mongoose.Schema({ code: String, status: String }, { collection: 'schools', strict: false })
  const School = mongoose.models.School || mongoose.model('School', schoolSchema)
  const school = await School.findOne({ status: 'active' }).lean()
  if (!school) { console.error('No active school found – run the seed first'); process.exit(1) }

  // ── 2. Find first active student in that school ───────────────────────────
  const studentSchema = new mongoose.Schema(
    { fullName: String, rollNumber: String, grade: Number, className: String, passwordHash: String, schoolId: mongoose.Schema.Types.ObjectId, status: String },
    { collection: 'students', strict: false }
  )
  const Student = mongoose.models.Student || mongoose.model('Student', studentSchema)
  const student = await Student.findOne({ schoolId: school._id, status: 'active' }).select('+passwordHash fullName _id').lean()
  if (!student) { console.error('No active student found'); process.exit(1) }

  // ── 3. Reset student code to KNOWN_CODE (bcrypt hash, same as login path) ─
  const newHash = await bcrypt.hash(KNOWN_CODE, 12)
  await Student.updateOne({ _id: student._id }, { $set: { passwordHash: newHash } })

  // ── 4. Print results ───────────────────────────────────────────────────────
  console.log('POSTMAN_SCHOOL_CODE=' + school.code)
  console.log('POSTMAN_STUDENT_ID=' + student._id.toString())
  console.log('POSTMAN_STUDENT_CODE=' + KNOWN_CODE)
  console.log('POSTMAN_STUDENT_NAME=' + student.fullName)

  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
