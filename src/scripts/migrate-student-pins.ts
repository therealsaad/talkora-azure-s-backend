import 'dotenv/config'
import mongoose from 'mongoose'
import { writeFileSync, appendFileSync } from 'fs'
import { Student } from '../models/Student'
import { newUniquePin } from '../utils/student-pin'
import { hashPassword } from '../utils/password'

async function main() {
  const apply = process.argv.includes('--apply')
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI
  if (!uri) throw new Error('Set MONGODB_URI (or MONGO_URI) before running')
  await mongoose.connect(uri)
  try {
    const candidates = await Student.find({ $or: [{ pinLookup: { $exists: false } }, { pinLookup: null }] }).select('_id schoolId fullName rollNumber grade').lean()
    console.log(`Students requiring PIN migration: ${candidates.length}`)
    if (!apply) { console.log('DRY RUN ONLY. Add --apply to issue PINs.'); return }
    if (!process.env.PIN_EXPORT_PATH) throw new Error('Set PIN_EXPORT_PATH to a secure local CSV destination; never commit it.')
    writeFileSync(process.env.PIN_EXPORT_PATH, 'studentId,schoolId,rollNumber,grade,fullName,pin\n', { mode: 0o600, flag: 'wx' })
    let migrated = 0
    const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    for (const student of candidates) {
      const { pin, digest } = await newUniquePin()
      const hash = await hashPassword(pin)
      const updated = await Student.updateOne({ _id: student._id, $or: [{ pinLookup: { $exists: false } }, { pinLookup: null }] }, { $set: { pinLookup: digest, passwordHash: hash }, $unset: { studentCode: '' } })
      if (updated.modifiedCount) {
        appendFileSync(process.env.PIN_EXPORT_PATH, [student._id, student.schoolId, student.rollNumber, student.grade, student.fullName, pin].map(quote).join(',') + '\n')
        migrated++
      }
    }
    console.log(`Migrated ${migrated} students. Protect and securely distribute the exported PIN CSV, then delete it.`)
  } finally { await mongoose.disconnect() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
