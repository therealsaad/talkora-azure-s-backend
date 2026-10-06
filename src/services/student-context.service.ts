import { Student } from '../models/Student'
import { CurriculumClass } from '../models/CurriculumClass'
import { Level } from '../models/Level'
import { Lesson } from '../models/Lesson'
import { Activity } from '../models/Activity'
import { Progress } from '../models/Progress'
import { MistakeRecord } from '../models/MistakeRecord'
import { Conversation } from '../models/Conversation'
import { StudentMemory } from '../models/StudentMemory'
import { MissJulieContext } from '../providers/ai/AIProvider'
import { ApiError } from '../utils/ApiError'
import { CurriculumAccessService } from './curriculum-access.service'
import { MemoryService } from './memory.service'

export interface CompactTutorContext extends MissJulieContext {
  classId?: string
  isFirstSession?: boolean
  lastSessionSummary?: string
  studentXp?: number
  studentStreak?: number
  completedLessonsCount?: number
}

/**
 * StudentContextService is the READ-ONLY assembly layer that gathers real MongoDB student state
 * (profile, curriculum progress, persistent memories, active weaknesses, and previous conversation summary)
 * into a compact, token-efficient structure for Qwen / Miss Julie.
 *
 * It NEVER mutates the database. It NEVER passes raw secrets, passwords, or enormous unstructured histories.
 */
export const StudentContextService = {
  async buildContext(
    studentId: string,
    options: {
      message?: string
      lessonId?: string
      activityId?: string
      promptContext?: string
      currentTarget?: string
    } = {},
  ): Promise<CompactTutorContext> {
    const student = await Student.findById(studentId).lean()
    if (!student) throw ApiError.notFound('Student not found')

    if (options.activityId) {
      await CurriculumAccessService.assertActivity(studentId, options.activityId)
    } else if (options.lessonId) {
      await CurriculumAccessService.assertLesson(studentId, options.lessonId)
    }

    const klass = await CurriculumClass.findOne({ grade: student.grade }).lean()

    let levelTitle = 'Talkora Adventure'
    let lessonTitle = 'English Practice'
    let activityTitle: string | undefined
    let activityTarget: string | undefined
    let unitNumber: number | undefined
    let stage: string | undefined
    let allowedVocabulary: string[] = []
    let learningObjectives: string[] = []
    let requiredConcepts: string[] = []
    let digitalType: string | undefined
    let julieProfile: Record<string, string> | undefined

    if (options.lessonId) {
      const lesson = await Lesson.findById(options.lessonId).lean()
      if (lesson) {
        lessonTitle = lesson.title
        const level = await Level.findById(lesson.levelId).lean()
        if (level) {
          levelTitle = level.title
          unitNumber = level.unitNumber || level.number
          learningObjectives = level.learningObjectives || []
        }
      }
    }

    if (options.activityId) {
      const activity = await Activity.findById(options.activityId)
        .select('-answer -answerConfig')
        .lean()
      if (activity) {
        activityTitle = activity.title
        const conversationTypes = new Set([
          'CONVERSATION',
          'OPEN_CONVERSATION',
          'FOLLOW_UP_CONVERSATION',
          'FINAL_CONVERSATION',
        ])
        const isOpenConversation =
          activity.metadata?.conversationMode === 'OPEN' ||
          conversationTypes.has(String(activity.type || ''))
        const fixedTtsText =
          typeof activity.metadata?.ttsText === 'string'
            ? activity.metadata.ttsText.trim()
            : ''

        // For a live conversation, the question visible to the learner is the
        // source of truth for Qwen too. Never let a stale pronunciation target
        // or a pre-generated TTS line silently change what Miss Julie teaches.
        activityTarget = isOpenConversation
          ? activity.teacherPrompt?.trim() || activity.prompt?.trim() || activity.target?.trim()
          : fixedTtsText || activity.teacherPrompt?.trim() || activity.target?.trim() || activity.prompt?.trim()
        stage = activity.stage
        allowedVocabulary = Array.isArray(activity.metadata?.allowedVocabulary)
          ? (activity.metadata.allowedVocabulary as string[])
          : []
        requiredConcepts = activity.conversationGoal?.requiredConcepts || []
        digitalType =
          typeof activity.metadata?.digitalType === 'string'
            ? activity.metadata.digitalType
            : undefined
        const profile = activity.metadata?.julieProfile
        if (profile && typeof profile === 'object' && !Array.isArray(profile)) {
          julieProfile = Object.fromEntries(
            Object.entries(profile as Record<string, unknown>)
              .filter(([, value]) => typeof value === 'string')
              .map(([key, value]) => [key, String(value)]),
          )
        }
      }
    }

    if (options.currentTarget?.trim()) {
      activityTarget = options.currentTarget.trim()
    }

    // Active unresolved mistakes
    const recentMistakes = await MistakeRecord.find({ studentId, resolved: false })
      .sort('-lastOccurredAt')
      .limit(5)
      .lean()

    // Structured memories
    const personalMemories = await MemoryService.relevantPersonalFacts(
      studentId,
      requiredConcepts.length ? requiredConcepts : ['favourite_sport', 'favourite_food', 'favourite_subject'],
    )
    const learningMemories = await MemoryService.relevantLearningEvidence(
      studentId,
      requiredConcepts,
    )

    // Fallback: if no concept-filtered memories found, grab top 6 general memories for personalization
    let generalMemories: Array<{ fact: string; key?: string; value?: string }> = []
    if (personalMemories.length === 0 && learningMemories.length === 0) {
      generalMemories = await StudentMemory.find({ studentId, confidence: { $gte: 0.6 } })
        .sort('-lastReinforcedAt')
        .limit(6)
        .lean()
    }

    const memoryFacts: string[] = [
      ...personalMemories.map((m) => (m.key && m.value ? `${m.key}: ${m.value}` : m.fact)),
      ...generalMemories.map((m) => (m.key && m.value ? `${m.key}: ${m.value}` : m.fact)),
    ].slice(0, 8)

    // Recent conversation and session continuity
    const conversation = options.activityId
      ? await Conversation.findOne({ studentId, activityId: options.activityId, status: 'ACTIVE' }).lean()
      : options.lessonId
        ? await Conversation.findOne({ studentId, lessonId: options.lessonId, status: 'ACTIVE' })
            .sort('-updatedAt')
            .lean()
        : await Conversation.findOne({ studentId, status: 'ACTIVE' })
            .sort('-updatedAt')
            .lean()

    // Find the latest completed conversation for previous session summary
    const pastCompletedConversation = await Conversation.findOne({
      studentId,
      status: 'COMPLETED',
      summary: { $exists: true, $ne: '' },
    })
      .sort('-completedAt')
      .lean()

    const lastSessionSummary = pastCompletedConversation?.summary || undefined
    const totalConversationsCount = await Conversation.countDocuments({ studentId })
    const isFirstSession = totalConversationsCount === 0

    const recentMessages = (conversation?.messages || []).slice(-8)
    const achievedConcepts = conversation?.goalState || []

    const recentJulieOpeners = (conversation?.messages || [])
      .filter((msg) => msg.role === 'missJulie')
      .slice(-4)
      .map((msg) => msg.content.split(/[.!?]/, 1)[0]?.trim() || '')

    // Student Progress metrics
    let studentXp = 0
    let studentStreak = 0
    let completedLessonsCount = 0

    if (klass) {
      const progress = await Progress.findOne({ studentId, classId: klass._id }).lean()
      if (progress) {
        studentXp = progress.xp || 0
        studentStreak = progress.streak || 0
        completedLessonsCount = progress.levels.reduce(
          (acc, lvl) => acc + lvl.lessons.filter((l) => l.completed).length,
          0,
        )
      }
    }

    return {
      studentName: student.fullName.split(' ')[0],
      grade: student.grade,
      avatarType: student.avatarType || 'BOY',
      levelTitle,
      lessonTitle,
      activityTitle,
      activityTarget,
      recentMistakes: recentMistakes.map(
        (m) => `${m.skill}: expected "${m.expected}", said "${m.actual}"`,
      ),
      memoryFacts,
      learningEvidence: [
        ...learningMemories.map((item) => item.fact),
        ...(conversation?.skillEvidence || [])
          .slice(-8)
          .map((item) => `${item.skill}: ${item.support.toLowerCase()}`),
      ].slice(-8),
      promptContext: options.promptContext || 'conversation',
      studentMessage: options.message || '',
      unitNumber,
      stage,
      allowedVocabulary,
      learningObjectives,
      requiredConcepts,
      achievedConcepts,
      remainingConcepts: requiredConcepts.filter(
        (concept) => !achievedConcepts.includes(concept),
      ),
      conversationHistory: recentMessages.map(
        (msg) => `${msg.role}: ${msg.content.slice(0, 420)}`,
      ),
      hintLevel: conversation?.retryState?.hintLevel || 0,
      waitingForRetry: Boolean(conversation?.retryState?.waiting),
      retryTargetSkill: conversation?.retryState?.targetSkill || '',
      recentJulieOpeners,
      digitalType,
      julieProfile,
      classId: klass?._id?.toString(),
      isFirstSession,
      lastSessionSummary,
      studentXp,
      studentStreak,
      completedLessonsCount,
    }
  },
}
