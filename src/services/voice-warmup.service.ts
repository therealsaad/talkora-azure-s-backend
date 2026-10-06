import { Activity } from '../models/Activity'
import { Lesson } from '../models/Lesson'
import { Level } from '../models/Level'
import { Progress } from '../models/Progress'
import { Student } from '../models/Student'
import { env } from '../config/env'
import { logger } from '../utils/logger'

function uniqueLines(lines: Array<string | undefined>, max: number): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of lines) {
    const line = value?.trim()
    if (!line || line.length > 600 || seen.has(line.toLowerCase())) continue
    seen.add(line.toLowerCase())
    result.push(line)
    if (result.length >= max) break
  }
  return result
}

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(env.voiceWarmupTimeoutMs),
  })
  if (!response.ok) throw new Error(`${response.status} ${await response.text().catch(() => '')}`)
  return response
}

export const VoiceWarmupService = {
  schedule(studentId: string) {
    if (!env.voiceWarmupEnabled) return
    setImmediate(() => {
      void this.warmStudent(studentId).catch((error) => {
        logger.warn('Student voice warmup failed without blocking login', { studentId, error })
      })
    })
  },

  async warmStudent(studentId: string) {
    const student = await Student.findById(studentId).select('fullName grade').lean()
    if (!student) return

    const firstName = student.fullName.trim().split(/\s+/)[0] || 'Explorer'
    const progress = await Progress.findOne({ studentId }).sort({ updatedAt: -1 }).lean()
    const current = progress?.levels.find((item) => item.status === 'in-progress')
      ?? progress?.levels.find((item) => item.status === 'unlocked')
    const level = current?.levelId ? await Level.findById(current.levelId).select('title').lean() : null

    let lessonTitle: string | undefined
    const lessonLines: string[] = []
    if (current?.levelId) {
      const lessons = await Lesson.find({ levelId: current.levelId, status: 'active' })
        .sort({ order: 1 })
        .select('_id title teacherIntroduction')
        .lean()
      const currentLesson = lessons.find((lesson) => {
        const state = current.lessons.find((item) => item.lessonId.toString() === lesson._id.toString())
        return !state?.completed
      }) ?? lessons[0]
      if (currentLesson) {
        lessonTitle = currentLesson.title
        const activities = await Activity.find({ lessonId: currentLesson._id, status: 'active', voiceEnabled: true })
          .sort({ order: 1 })
          .limit(env.voiceWarmupMaxItems)
          .select('prompt teacherPrompt target modelSentence')
          .lean()
        lessonLines.push(currentLesson.teacherIntroduction || '')
        for (const activity of activities) {
          lessonLines.push(activity.teacherPrompt || activity.prompt || activity.modelSentence || activity.target || '')
        }
      }
    }

    const fixedLines = uniqueLines([
      `Hi ${firstName}, welcome back!`,
      level?.title ? `Ready to continue ${level.title}?` : 'Ready for your next English adventure?',
      lessonTitle ? `Let's continue with ${lessonTitle}.` : undefined,
      ...lessonLines,
    ], env.voiceWarmupMaxItems)

    if (!fixedLines.length) return

    // Fixed lesson/page speech belongs to the persistent IndicF5 cache. The same
    // AI service hosts Qwen + IndicF5 in the default local deployment, but a
    // separate INDICF5_SERVICE_URL can be supplied for production GPU hosting.
    const baseUrl = env.indicf5ServiceUrl || env.aiServiceUrl
    if (!baseUrl) return

    const headers: Record<string, string> = {}
    if (env.indicf5ApiKey) headers['X-Talkora-TTS-Key'] = env.indicf5ApiKey

    try {
      await postJson(`${baseUrl.replace(/\/$/, '')}/v1/tts/warmup`, {
        texts: fixedLines,
        language: 'en-IN',
      }, headers)
    } catch (error) {
      logger.warn('IndicF5 lesson voice warmup unavailable', { studentId, error })
    }
  },
}
