import mongoose from 'mongoose'
import { connectDatabase, disconnectDatabase } from '../config/db'
import { CurriculumClass } from '../models/CurriculumClass'
import { Level } from '../models/Level'
import { Lesson } from '../models/Lesson'
import { Activity } from '../models/Activity'
import { unit1FavouriteThingsActivities } from '../seed/data/unit1FavouriteThings'
import { planUnit1Migration } from './plan-unit1-migration'

async function main() {
  await connectDatabase()
  try {
    const klass = await CurriculumClass.findOne({ grade: 4 }).lean()
    if (!klass) throw new Error('Class 4 curriculum is missing')
    const level = await Level.findOne({ classId: klass._id, number: 1 }).lean()
    if (!level) throw new Error('Class 4 Level 1 is missing')
    const lesson = await Lesson.findOne({ levelId: level._id }).sort({ order: 1 }).lean()
    if (!lesson) throw new Error('Level 1 lesson is missing')

    const existing = await Activity.find({ lessonId: lesson._id }).select('_id order metadata').lean()
    const authored = unit1FavouriteThingsActivities
    const plan = planUnit1Migration(
      existing.map((activity) => ({ id: activity._id.toString(), digitalType: String(activity.metadata?.digitalType || '') })),
      authored.map((activity) => String(activity.metadata?.digitalType || '')),
    )
    console.info(`Level 1 plan: preserve ${plan.filter((step) => step.existingId).length} activities, add ${plan.filter((step) => !step.existingId).length}`)
    if (!process.argv.includes('--apply')) {
      console.info('Dry run complete. Pass --apply to update Level 1.')
      return
    }

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        // Vacate positive positions first so the unique lesson/order index stays valid.
        for (const activity of existing) {
          await Activity.updateOne({ _id: activity._id }, { $set: { order: -Math.abs(activity.order) } }, { session })
        }
        for (const step of plan) {
          const content = { ...authored[step.order - 1]!, lessonId: lesson._id, order: step.order, status: 'active' as const }
          if (step.existingId) {
            await Activity.updateOne({ _id: step.existingId }, { $set: content }, { session, runValidators: true })
          } else {
            await Activity.create([content], { session })
          }
        }
      })
    } finally {
      await session.endSession()
    }
    console.info('Level 1 syllabus migration complete; existing activity IDs and student progress were preserved.')
  } finally {
    await disconnectDatabase()
  }
}

void main().catch((error) => {
  console.error('Level 1 syllabus migration failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
