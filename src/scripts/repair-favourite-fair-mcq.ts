/** Safe, narrowly scoped patch of the first two existing Favourite Fair activities.
 * Dry run by default. Preserves IDs and progress; never inserts duplicate activities.
 */
import { connectDatabase, disconnectDatabase } from '../config/db'
import { Level } from '../models/Level'
import { Lesson } from '../models/Lesson'
import { Activity } from '../models/Activity'

async function main() {
  await connectDatabase()
  try {
    const levels = await Level.find({ unitNumber: 1, term: 1, title: /favourite/i })
    if (levels.length !== 1) throw new Error(`Expected one Unit 1 favourite level; found ${levels.length}. No changes made.`)
    const lessons = await Lesson.find({ levelId: levels[0]._id }).sort({ order: 1 })
    if (!lessons.length) throw new Error('No lesson found for Favourite Fair')
    const activities = await Activity.find({ lessonId: lessons[0]._id, status: { $ne: 'archived' } }).sort({ order: 1 })
    const first = activities[0], second = activities[1]
    if (!first || !second) throw new Error('At least two existing activities required; no changes made')
    const expectedSecond = /word meaning|favourite/i.test(second.title)
    if (!expectedSecond) throw new Error(`Second activity is '${second.title}', not Word Meaning. Aborting to protect existing lesson data.`)
    const replacements = [
      { item: first, title: 'Favourite Fair Quiz', prompt: 'Which of these is a sport?', choices: ['Cricket', 'Cake', 'Homework'], answer: 'Cricket' },
      { item: second, title: 'Word Meaning', prompt: 'What does favourite mean?', choices: ['The one I like the most', 'Something I never use', 'Something very small'], answer: 'The one I like the most' },
    ]
    console.log(JSON.stringify({ level: levels[0].title, lesson: lessons[0].title, changes: replacements.map(({item,title,prompt,choices}) => ({ id: item.id, before: { title: item.title, type: item.type }, after: { title, prompt, choices } })), apply: process.argv.includes('--apply') }, null, 2))
    if (!process.argv.includes('--apply')) return
    for (const { item, title, prompt, choices, answer } of replacements) {
      item.set({ type: 'MCQ', title, prompt, teacherPrompt: prompt, instruction: 'Tap one answer.', choices, answer, target: answer,
        aiEnabled: false, allowMic: false, allowOptions: true, repeatRequired: false, voiceEnabled: true,
        metadata: { ...(item.metadata || {}), digitalType: 'MULTIPLE_CHOICE', optionMode: true, micMode: false, allowMic: false, ttsText: prompt, conversationMode: 'CONTROLLED' } })
      await item.save()
    }
    console.log('Updated two existing quiz activities without replacing IDs or deleting progress.')
  } finally { await disconnectDatabase() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
