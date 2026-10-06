import { Activity } from '../models/Activity'
import { CurriculumClass } from '../models/CurriculumClass'
import { Lesson } from '../models/Lesson'
import { Level } from '../models/Level'
import { env } from '../config/env'

function collectStrings(value: unknown, output: string[]) {
  if (typeof value === 'string') {
    const text = value.trim()
    if (text.length >= 2 && text.length <= 600) output.push(text)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, output)
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (/answer|correct|expectedpatterns|keywords/i.test(key)) continue
      if (/teacher|julie|prompt|instruction|model|dialogue|speech|tts|hint|transition|message|line/i.test(key)) {
        collectStrings(child, output)
      }
    }
  }
}

function uniqueLines(lines: string[]) {
  const seen = new Set<string>()
  return lines.filter((line) => {
    const key = line.toLowerCase().replace(/\s+/g, ' ').trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function pageGuidance(firstName: string) {
  return [
    `Hi ${firstName}! Welcome back to Talkora. Ready for another English adventure?`,
    `Great to see you, ${firstName}! Choose an adventure and let us continue learning English together.`,
    `This adventure looks exciting, ${firstName}! Choose a stage and I will guide you.`,
    `Ready to practise, ${firstName}? Choose a skill and let us get stronger together.`,
    `Look how far you have come, ${firstName}! Let us check your progress together.`,
    `You have earned some lovely rewards, ${firstName}. Keep speaking bravely and kindly!`,
    `Hi ${firstName}! This is your Talkora profile. You can always come back and see how much you have grown.`,
  ]
}

export const SyllabusVoiceWarmupService = {
  async triggerForStudent(student: { id: string; grade: number; fullName: string }) {
    try {
      const curriculumClass = await CurriculumClass.findOne({
        grade: student.grade,
        status: 'active',
      }).select('_id grade name')

      if (!curriculumClass) {
        console.warn('VOICE_PREWARM_SKIPPED', { reason: 'NO_CURRICULUM_CLASS', grade: student.grade })
        return
      }

      const levels = await Level.find({
        classId: curriculumClass._id,
        status: 'active',
        availability: 'PUBLISHED',
      })
        .select('_id number title curriculumVersion')
        .sort({ order: 1 })
        .lean()

      const lessons = await Lesson.find({
        levelId: { $in: levels.map((level) => level._id) },
        status: 'active',
      })
        .select('_id levelId title teacherIntroduction settings')
        .sort({ order: 1 })
        .lean()

      const activities = await Activity.find({
        lessonId: { $in: lessons.map((lesson) => lesson._id) },
        status: 'active',
        voiceEnabled: true,
      })
        .select('lessonId title prompt instruction teacherPrompt modelSentence hint content metadata stage type order')
        .sort({ order: 1 })
        .lean()

      const lines: string[] = []
      for (const lesson of lessons) {
        collectStrings(lesson.teacherIntroduction, lines)
        collectStrings(lesson.settings, lines)
      }

      for (const activity of activities) {
        collectStrings(activity.teacherPrompt, lines)
        collectStrings(activity.prompt, lines)
        collectStrings(activity.instruction, lines)
        collectStrings(activity.modelSentence, lines)
        collectStrings(activity.hint, lines)
        collectStrings(activity.content, lines)
        collectStrings(activity.metadata, lines)
      }

      const firstName = student.fullName.trim().split(/\s+/)[0] || 'Explorer'
      const fixedLessonLines = uniqueLines(lines).slice(0, env.ttsLoginPrewarmMaxLines)
      const personalPageLines = uniqueLines(pageGuidance(firstName))

      if (!fixedLessonLines.length && !personalPageLines.length) {
        console.warn('VOICE_PREWARM_SKIPPED', { reason: 'NO_LINES', grade: student.grade })
        return
      }

      const postPack = async (key: string, packLines: string[], metadata: Record<string, unknown>) => {
        if (!packLines.length) return
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), env.voicePrewarmRequestTimeoutMs)
        try {
          const response = await fetch(`${env.aiServiceUrl.replace(/\/$/, '')}/v1/tts/prewarm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, lines: packLines, metadata }),
            signal: controller.signal,
          })
          if (!response.ok) {
            console.error('VOICE_PREWARM_REJECTED', { key, status: response.status })
            return
          }
          const payload = await response.json().catch(() => ({}))
          console.info('VOICE_PREWARM_ACCEPTED', { key, lines: packLines.length, payload })
        } finally {
          clearTimeout(timeout)
        }
      }

      const curriculumVersion = levels.map((level) => level.curriculumVersion).filter(Boolean)[0] || 'talkora-syllabus-v1'

      // Shared grade pack: generated once and reused by every student in that grade.
      await postPack(
        `grade-${student.grade}-${curriculumVersion}`,
        fixedLessonLines,
        {
          trigger: 'student-login',
          kind: 'fixed-syllabus',
          grade: student.grade,
          levelCount: levels.length,
          lessonCount: lessons.length,
          activityCount: activities.length,
        },
      )

      // Personalized page pack: student name is part of the audio, so keep it separate.
      await postPack(
        `student-${student.id}-page-guidance`,
        personalPageLines,
        {
          trigger: 'student-login',
          kind: 'page-guidance',
          studentId: student.id,
          grade: student.grade,
          firstName,
        },
      )
    } catch (error) {
      // Voice preloading must never block or fail login.
      console.error('VOICE_PREWARM_FAILED', {
        studentId: student.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },

  async prewarmForStudentGrade(grade: number) {
    return this.triggerForStudent({ id: `grade-${grade}`, grade, fullName: 'Explorer' })
  },
}
