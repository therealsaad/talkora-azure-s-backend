import { DailyChallenge } from '../models/DailyChallenge'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export const DailyChallengeService = {
  async getTodayForClass(classId: string) {
    return DailyChallenge.findOne({ date: today(), classId }).populate('activityIds').lean()
  },

  async create(input: { date: string; classId: string; title: string; description?: string; activityIds: string[]; xpReward?: number }) {
    return DailyChallenge.create(input)
  },
}
