import mongoose from 'mongoose'
import { connectDatabase, disconnectDatabase } from '../config/db'
import '../models/School'
import '../models/Teacher'
import '../models/Student'
import '../models/Progress'
import '../models/ActivityAttempt'
import '../models/VoiceSession'
import '../models/Conversation'
import '../models/StudentMemory'
import '../models/MistakeRecord'
import '../models/LearningEvent'
import '../models/Activity'
import '../models/Lesson'
import '../models/Level'
import '../models/CurriculumClass'

async function main() {
  await connectDatabase()
  try {
    const activities = mongoose.connection.db!.collection('activities')
    const lessonOrder = (await activities.indexes()).find((index) => index.name === 'lessonId_1_order_1')
    if (lessonOrder && !lessonOrder.unique) {
      const duplicates = await activities.aggregate([
        { $group: { _id: { lessonId: '$lessonId', order: '$order' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 1 },
      ]).toArray()
      if (duplicates.length) throw new Error('Activity lesson/order values are duplicated; resolve them before creating the unique index')
      await activities.dropIndex('lessonId_1_order_1')
      console.info('Replacing legacy Activity lesson/order index with its unique version')
    }
    const students = mongoose.connection.db!.collection('students')
    const studentIndexes = await students.indexes()
    for (const index of studentIndexes) {
      const keys = index.key ? Object.keys(index.key) : []
      const isLegacyRollIndex = keys.length === 1 && keys[0] === 'rollNumber' && index.key?.rollNumber === 1
      const isLegacyStudentCodeIndex = keys.length === 2 && keys[0] === 'schoolId' && keys[1] === 'studentCode'
      if (index.name && (isLegacyRollIndex || isLegacyStudentCodeIndex)) {
        await students.dropIndex(index.name)
        console.info(`Removed legacy Student index ${index.name}`)
      }
    }
    for (const name of mongoose.modelNames()) {
      await mongoose.model(name).createIndexes()
      console.info(`Ensured indexes for ${name}`)
    }
  } finally {
    await disconnectDatabase()
  }
}

void main().catch((error) => {
  console.error('Index creation failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
