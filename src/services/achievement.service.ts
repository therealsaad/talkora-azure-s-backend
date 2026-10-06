import { Achievement, IAchievement } from '../models/Achievement'
import { AchievementUnlock } from '../models/AchievementUnlock'
import { ActivityAttempt } from '../models/ActivityAttempt'
import { Progress } from '../models/Progress'
import { LearningEvent } from '../models/LearningEvent'

/**
 * Achievements are awarded server-side only. Each Achievement document's `criteria` is
 * interpreted here; the frontend only ever reads AchievementUnlock — it cannot unlock one itself.
 */
async function computeProgressForCriteria(studentId: string, criteria: Record<string, unknown>): Promise<number> {
  const type = criteria.type as string

  switch (type) {
    case 'activities_completed': {
      const target = Number(criteria.count ?? 1)
      const completed = await ActivityAttempt.countDocuments({ studentId, correct: true })
      return Math.min(100, Math.round((completed / target) * 100))
    }
    case 'speaking_attempts': {
      const target = Number(criteria.count ?? 1)
      const count = await ActivityAttempt.countDocuments({ studentId })
      // Speaking-type attempts are tagged via LearningEvent metadata at submission time in practice;
      // as a conservative proxy we count attempts on activities whose lesson used a speaking activity type.
      const speakingEvents = await LearningEvent.countDocuments({ studentId, type: 'speaking_attempt' })
      return Math.min(100, Math.round((Math.max(speakingEvents, 0) / target) * 100)) || (count > 0 && target <= 0 ? 100 : 0)
    }
    case 'perfect_lesson': {
      const progressDocs = await Progress.find({ studentId }).lean()
      const hasPerfect = progressDocs.some((p) => p.levels.some((l) => l.lessons.some((les) => les.completed && les.accuracy === 100)))
      return hasPerfect ? 100 : 0
    }
    case 'streak': {
      const target = Number(criteria.days ?? 7)
      const progressDocs = await Progress.find({ studentId }).lean()
      const maxStreak = progressDocs.reduce((max, p) => Math.max(max, p.streak ?? 0), 0)
      return Math.min(100, Math.round((maxStreak / target) * 100))
    }
    case 'levels_completed': {
      const target = Number(criteria.count ?? 1)
      const progressDocs = await Progress.find({ studentId }).lean()
      const completedLevels = progressDocs.reduce((sum, p) => sum + p.levels.filter((l) => l.status === 'completed').length, 0)
      return Math.min(100, Math.round((completedLevels / target) * 100))
    }
    default:
      return 0
  }
}

export const AchievementService = {
  async listCatalog() {
    return Achievement.find().lean()
  },

  async listForStudent(studentId: string) {
    const [achievements, unlocks] = await Promise.all([
      Achievement.find().lean(),
      AchievementUnlock.find({ studentId }).lean(),
    ])
    const byAchievement = new Map(unlocks.map((u) => [u.achievementId.toString(), u]))
    return achievements.map((a) => {
      const unlock = byAchievement.get(a._id.toString())
      return {
        id: a._id,
        key: a.key,
        title: a.title,
        description: a.description,
        category: a.category,
        icon: a.icon,
        unlocked: unlock?.unlocked ?? false,
        progress: unlock?.progress ?? 0,
      }
    })
  },

  /** Recomputes progress for every achievement and unlocks any that just crossed 100%. Call after any attempt/progress change. */
  async evaluateForStudent(studentId: string) {
    const achievements = await Achievement.find().lean<IAchievement[]>()
    const newlyUnlocked: IAchievement[] = []

    for (const achievement of achievements) {
      const progressPct = await computeProgressForCriteria(studentId, achievement.criteria)
      const existing = await AchievementUnlock.findOne({ studentId, achievementId: achievement._id })
      const wasUnlocked = existing?.unlocked ?? false
      const isUnlocked = progressPct >= 100

      await AchievementUnlock.findOneAndUpdate(
        { studentId, achievementId: achievement._id },
        { progress: progressPct, unlocked: isUnlocked, ...(isUnlocked && !wasUnlocked ? { unlockedAt: new Date() } : {}) },
        { upsert: true },
      )

      if (isUnlocked && !wasUnlocked) {
        newlyUnlocked.push(achievement)
        await LearningEvent.create({ studentId, type: 'achievement_unlocked', metadata: { achievementKey: achievement.key } })
      }
    }

    return newlyUnlocked
  },
}
