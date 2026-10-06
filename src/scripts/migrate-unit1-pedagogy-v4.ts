import mongoose from 'mongoose'
import { connectDatabase, disconnectDatabase } from '../config/db'
import { CurriculumClass } from '../models/CurriculumClass'
import { Level } from '../models/Level'
import { Lesson } from '../models/Lesson'
import { Activity } from '../models/Activity'
import { unit1FavouriteThingsActivities } from '../seed/data/unit1FavouriteThings'

const RELEASE = 'term1-favourites-v4'

async function main() {
  await connectDatabase()

  try {
    const klass = await CurriculumClass.findOne({ grade: 4, status: 'active' }).lean()
    if (!klass) throw new Error('Active Class 4 curriculum is missing')

    const level = await Level.findOne({ classId: klass._id, number: 1, status: 'active' }).lean()
    if (!level) throw new Error('Active Class 4 Level 1 is missing')

    const lesson = await Lesson.findOne({ levelId: level._id, status: 'active' }).sort({ order: 1 }).lean()
    if (!lesson) throw new Error('Active Class 4 Level 1 lesson is missing')

    const existing = await Activity.find({ lessonId: lesson._id })
      .select('_id order status activityKey curriculumVersion metadata title type stage prompt teacherPrompt instruction')
      .sort({ order: 1 })
      .lean()
    const active = existing.filter((activity) => activity.status === 'active')
    const isCurrentRelease = active.length === unit1FavouriteThingsActivities.length
      && active.every((activity) => activity.curriculumVersion === RELEASE)
    const authoredCopyChanged = unit1FavouriteThingsActivities.some((authored) => {
      const current = active.find((activity) => activity.activityKey === authored.activityKey)
      return !current || current.prompt !== authored.prompt
        || current.teacherPrompt !== authored.teacherPrompt
        || current.instruction !== authored.instruction
    })

    console.info(`Level 1 lesson: ${lesson.title}`)
    console.info(`Current activities: ${active.length}; new progression: ${unit1FavouriteThingsActivities.length}`)
    if (isCurrentRelease && !authoredCopyChanged) {
      for (const activity of active) {
        console.info(`${activity.order}. ${activity.title} [${activity.type}/${activity.stage}]`)
      }
      console.info(`Unit 1 already uses ${RELEASE}; no changes made.`)
      return
    }

    if (isCurrentRelease && authoredCopyChanged) {
      if (!process.argv.includes('--apply')) {
        console.info('The live activity IDs match this release, but authored prompts have changed.')
        console.info('Pass --apply to sync the copy in place while preserving activity IDs and learner progress.')
        return
      }

      const session = await mongoose.startSession()
      try {
        await session.withTransaction(async () => {
          for (let index = 0; index < unit1FavouriteThingsActivities.length; index += 1) {
            const authored = unit1FavouriteThingsActivities[index]!
            const activityKey = authored.activityKey || `class4-unit1-favourites-v4-${index + 1}`
            await Activity.updateOne(
              { lessonId: lesson._id, activityKey, status: 'active' },
              {
                $set: {
                  ...authored,
                  lessonId: lesson._id,
                  order: index + 1,
                  status: 'active',
                  curriculumVersion: RELEASE,
                  grade: 4,
                  term: 1,
                  unitNumber: 1,
                  activityKey,
                  metadata: { ...authored.metadata, lessonExperienceVersion: RELEASE },
                },
              },
              { session, runValidators: true },
            )
          }
        })
      } finally {
        await session.endSession()
      }
      console.info('Unit 1 prompt copy was synced in place; activity IDs and learner progress were preserved.')
      return
    }

    if (!process.argv.includes('--apply')) {
      console.info('Target progression:')
      for (const activity of unit1FavouriteThingsActivities) {
        console.info(`${activity.order}. ${activity.title} [${activity.type}/${activity.stage}]`)
      }
      console.info('Dry run complete. Pass --apply to archive the current activity rows and publish the new ten-step lesson.')
      return
    }

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        // Preserve the old activity IDs and their attempt/progress references.
        // Move all existing rows out of positive lesson-order slots before adding the new IDs.
        for (let index = 0; index < existing.length; index += 1) {
          const old = existing[index]!
          await Activity.updateOne(
            { _id: old._id },
            {
              $set: {
                order: -(500_000 + index),
                status: 'archived',
                'metadata.archivedBy': RELEASE,
              },
            },
            { session },
          )
        }

        const replacementActivities = unit1FavouriteThingsActivities.map((activity, index) => ({
          ...activity,
          lessonId: lesson._id,
          order: index + 1,
          status: 'active' as const,
          curriculumVersion: RELEASE,
          grade: 4,
          term: 1,
          unitNumber: 1,
          activityKey: activity.activityKey || `class4-unit1-favourites-v4-${index + 1}`,
          metadata: { ...activity.metadata, lessonExperienceVersion: RELEASE },
        }))

        await Activity.create(replacementActivities, { session, ordered: true })

        await Lesson.updateOne(
          { _id: lesson._id },
          {
            $set: {
              title: 'My Favourite Things',
              subtitle: 'Listen, learn, speak, build a sentence, and celebrate your favourites.',
              estimatedMinutes: 15,
              xpReward: unit1FavouriteThingsActivities.reduce((sum, activity) => sum + activity.xp, 0),
              teacherIntroduction: 'Welcome! Let us discover what you like, practise useful sentences, and have a real conversation.',
            },
          },
          { session },
        )
      })
    } finally {
      await session.endSession()
    }

    console.info(`Unit 1 now uses ${RELEASE}; ${existing.length} previous activity rows were archived with their IDs preserved.`)
  } finally {
    await disconnectDatabase()
  }
}

void main().catch((error) => {
  console.error('Unit 1 pedagogy migration failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
