import { connectDatabase, disconnectDatabase } from '../config/db'
import { Student } from '../models/Student'

async function migrate() {
  await connectDatabase()
  const result = await Student.updateMany({ avatarType: { $exists: false } }, { $set: { avatarType: 'BOY' } })
  console.log(`Student avatar migration complete: matched ${result.matchedCount}, updated ${result.modifiedCount}.`)
  await disconnectDatabase()
}

migrate().catch((error) => {
  console.error('Student avatar migration failed', error)
  process.exit(1)
})
