import { connectDatabase, disconnectDatabase } from '../config/db'
import { CurriculumClass } from '../models/CurriculumClass'
import { Level } from '../models/Level'
import { Lesson } from '../models/Lesson'
import { Activity } from '../models/Activity'
import { Progress } from '../models/Progress'

const ranges = [[11,26],[27,42],[43,60],[61,77]] as const

async function migrate() {
  await connectDatabase()
  const class4 = await CurriculumClass.findOneAndUpdate({ grade: 4 }, { status: 'active' }, { new: true })
  if (!class4) throw new Error('Class 4 curriculum is missing; run the authoring seed first')
  await CurriculumClass.updateMany({ grade: { $gt: 4 } }, { status: 'draft' })
  await Level.updateMany({ classId: { $ne: class4._id } }, { status: 'draft', availability: 'UPCOMING' })
  const units = await Level.find({ classId: class4._id }).sort('unitNumber')
  for (const unit of units) {
    const index = unit.unitNumber - 1
    const published = index >= 0 && index < 4
    unit.curriculumVersion = 'class4-term1-v1'
    unit.availability = published ? 'PUBLISHED' : 'UPCOMING'
    unit.status = 'active'
    unit.sourceBook = published ? 'Talkora syllabus,1.pdf' : undefined
    unit.sourcePages = published ? Array.from({ length: ranges[index][1] - ranges[index][0] + 1 }, (_, offset) => ranges[index][0] + offset) : []
    await unit.save()
    if (!published) continue
    const lessons = await Lesson.find({ levelId: unit._id }).select('_id')
    const activities = await Activity.find({ lessonId: { $in: lessons.map((lesson) => lesson._id) } }).sort('order')
    for (const activity of activities) {
      const pages = index === 0 ? (activity.order === 1 ? [12,12] : activity.order <= 5 ? [13,15] : activity.order <= 10 ? [16,20] : activity.order === 11 ? [21,23] : [24,25]) : ranges[index]
      activity.required = activity.core !== false
      activity.allowMic = activity.voiceEnabled
      activity.allowOptions = Boolean(activity.choices?.length)
      activity.repeatRequired = activity.type === 'LISTEN_AND_REPEAT'
      activity.maxConversationTurns = ['INTERACT','FINAL_TALK'].includes(activity.stage) ? 4 : 1
      activity.source = { sourceType: 'SYLLABUS', pdf: 'Talkora syllabus,1.pdf', pageStart: pages[0], pageEnd: pages[1], label: `${unit.title} - ${activity.stage}` }
      if (index === 0) activity.stage = ({ 8: 'FOLLOW_UP', 9: 'REASONS', 10: 'FOLLOW_UP', 11: 'RESPECT_DIFFERENCES' } as Record<number, typeof activity.stage>)[activity.order] || activity.stage
      if (index === 0 && activity.order === 6) activity.conversationGoal = { requiredConcepts: ['state_favourite','answer_follow_up'], minTurns: 2, maxTurns: 4 }
      if (index === 0 && [10,13].includes(activity.order)) activity.conversationGoal = { requiredConcepts: ['state_favourite','answer_follow_up','give_reason'], minTurns: 2, maxTurns: 4 }
      await activity.save()
    }
  }
  await Progress.updateMany({ classId: class4._id, $or: [{ curriculumVersion: { $exists: false } }, { curriculumVersion: 'legacy' }] }, { curriculumVersion: 'class4-term1-v1' })
  console.log(JSON.stringify({ curriculumVersion: 'class4-term1-v1', class4Units: units.length, studentsModified: 0, progressDeleted: 0 }))
  await disconnectDatabase()
}

migrate().catch(async (error) => { console.error(error instanceof Error ? error.message : error); await disconnectDatabase().catch(() => undefined); process.exit(1) })
