import { MistakeService } from './mistake.service'
import { Progress } from '../models/Progress'

/**
 * Deterministic, rule-based recommendations from real signals (mistakes, accuracy, completion,
 * recency) — not fabricated AI output. This service is intentionally simple and replaceable by a
 * future learned recommendation model without changing its calling contract.
 */
export const RecommendationService = {
  async recommendForStudent(studentId: string) {
    const weakSkills = await MistakeService.weakSkills(studentId, 3)
    const progressDocs = await Progress.find({ studentId }).lean()

    const recommendations: string[] = []

    if (weakSkills.length > 0) {
      recommendations.push(`Practice ${weakSkills[0]._id} — it's come up ${weakSkills[0].occurrences} times recently.`)
    }

    const staleProgress = progressDocs.find((p) => {
      if (!p.lastActivityAt) return false
      const daysSince = (Date.now() - new Date(p.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
      return daysSince > 3
    })
    if (staleProgress) {
      recommendations.push(`It's been a few days — a short review lesson would help keep your streak going.`)
    }

    const lowAccuracy = progressDocs.some((p) => p.levels.some((l) => l.accuracy > 0 && l.accuracy < 70))
    if (lowAccuracy) {
      recommendations.push(`Revisit the current level's earlier lessons to build accuracy before moving on.`)
    }

    if (recommendations.length === 0) {
      recommendations.push(`Keep going — try the next lesson in your current level!`)
    }

    return recommendations
  },
}
