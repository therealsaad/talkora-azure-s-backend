import mongoose from 'mongoose'
import { connectDatabase, disconnectDatabase } from '../config/db'
import { CurriculumClass } from '../models/CurriculumClass'
import { Level } from '../models/Level'
import { Lesson } from '../models/Lesson'
import { Activity } from '../models/Activity'
import { unit1FavouriteThingsActivities } from '../seed/data/unit1FavouriteThings'

/**
 * Rebuilds Class 4 / Unit 1 as the ten-step Talkora lesson experience.
 * Existing activity ids are reused by position whenever possible so historical
 * attempts/progress do not become dangling references. Extra legacy activities
 * are archived instead of deleted.
 */
async function main() {
  if (process.argv.includes('--apply')) {
    console.info('This positional migration is retired. Use pnpm migrate:unit1-pedagogy -- --apply to preserve Unit 1 history.')
    return
  }

  await connectDatabase()

  try {
    const klass = await CurriculumClass.findOne({ grade: 4 }).lean()
    if (!klass) throw new Error('Class 4 curriculum is missing')

    const level = await Level.findOne({ classId: klass._id, number: 1 }).lean()
    if (!level) throw new Error('Class 4 Level 1 is missing')

    const lesson = await Lesson.findOne({ levelId: level._id }).sort({ order: 1 }).lean()
    if (!lesson) throw new Error('Level 1 lesson is missing')

    const existing = await Activity.find({ lessonId: lesson._id }).sort({ order: 1, createdAt: 1 }).lean()

    console.info(`Unit 1 current activities: ${existing.length}`)
    console.info(`Unit 1 target activities: ${unit1FavouriteThingsActivities.length}`)

    if (!process.argv.includes('--apply')) {
      unit1FavouriteThingsActivities.forEach((activity) => {
        console.info(`${activity.order}. ${activity.title} [${String(activity.metadata?.digitalType || '')}]`)
      })
      console.info('Dry run complete. Pass --apply to update Unit 1.')
      return
    }

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        // Vacate the unique lesson/order positions before re-numbering.
        for (let index = 0; index < existing.length; index += 1) {
          await Activity.updateOne(
            { _id: existing[index]!._id },
            { $set: { order: -(1000 + index), status: 'draft' } },
            { session },
          )
        }

        for (let index = 0; index < unit1FavouriteThingsActivities.length; index += 1) {
          const authored = unit1FavouriteThingsActivities[index]!
          const content = {
            ...authored,
            lessonId: lesson._id,
            order: index + 1,
            status: 'active' as const,
          }

          const old = existing[index]
          if (old) {
            await Activity.updateOne(
              { _id: old._id },
              { $set: content },
              { session, runValidators: true },
            )
          } else {
            await Activity.create([content], { session })
          }
        }

        // Keep legacy ids/history but make old surplus episodes invisible.
        for (let index = unit1FavouriteThingsActivities.length; index < existing.length; index += 1) {
          await Activity.updateOne(
            { _id: existing[index]!._id },
            {
              $set: {
                status: 'archived',
                order: -(2000 + index),
                'metadata.archivedBy': 'unit1-experience-v2',
              },
            },
            { session },
          )
        }

        await Lesson.updateOne(
          { _id: lesson._id },
          {
            $set: {
              title: 'My Favourite Things',
              subtitle: 'Listen, speak, ask, respond, and enjoy a real favourites conversation.',
              estimatedMinutes: 15,
              xpReward: unit1FavouriteThingsActivities.reduce((sum, activity) => sum + activity.xp, 0),
              teacherIntroduction: 'Welcome to My Favourite Things! We will listen, speak, ask questions, and finish with a real conversation.',
            },
          },
          { session },
        )
      })
    } finally {
      await session.endSession()
    }

    console.info('Unit 1 experience v2 migration complete.')
  } finally {
    await disconnectDatabase()
  }
}

void main().catch((error) => {
  console.error('Unit 1 experience v2 migration failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
