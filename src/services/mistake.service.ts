import { Types } from 'mongoose'
import { MistakeRecord } from '../models/MistakeRecord'

export interface RecordMistakeInput {
  skill: string
  expected: string
  actual: string
  activityId?: string
  lessonId?: string
  type?: string
}

export const MistakeService = {
  async listForStudent(studentId: string, includeResolved = false) {
    const filter: Record<string, unknown> = { studentId: new Types.ObjectId(studentId) }
    if (!includeResolved) filter.resolved = false
    return MistakeRecord.find(filter).sort('-lastOccurredAt').lean()
  },

  async weakSkills(studentId: string, limit = 5) {
    return MistakeRecord.aggregate([
      { $match: { studentId: new Types.ObjectId(studentId), resolved: false } },
      { $group: { _id: '$skill', occurrences: { $sum: '$attemptCount' }, lastOccurredAt: { $max: '$lastOccurredAt' } } },
      { $sort: { occurrences: -1, lastOccurredAt: -1 } },
      { $limit: limit },
    ])
  },

  async recordMistake(studentId: string, input: RecordMistakeInput) {
    const skill = input.skill.trim().toLowerCase()
    if (!skill || !input.expected || !input.actual) return null

    // Look for existing unresolved mistake on this skill
    const existing = await MistakeRecord.findOne({
      studentId: new Types.ObjectId(studentId),
      skill,
      resolved: false,
    })

    if (existing) {
      existing.attemptCount += 1
      existing.actual = input.actual.slice(0, 300)
      existing.expected = input.expected.slice(0, 300)
      existing.lastOccurredAt = new Date()
      if (input.activityId) existing.activityId = new Types.ObjectId(input.activityId)
      if (input.lessonId) existing.lessonId = new Types.ObjectId(input.lessonId)
      await existing.save()
      return existing
    }

    return MistakeRecord.create({
      studentId: new Types.ObjectId(studentId),
      activityId: input.activityId ? new Types.ObjectId(input.activityId) : undefined,
      lessonId: input.lessonId ? new Types.ObjectId(input.lessonId) : undefined,
      type: input.type || 'conversation',
      skill,
      expected: input.expected.slice(0, 300),
      actual: input.actual.slice(0, 300),
      attemptCount: 1,
      resolved: false,
      lastOccurredAt: new Date(),
    })
  },

  async resolveMistake(studentId: string, skill: string) {
    const normalizedSkill = skill.trim().toLowerCase()
    return MistakeRecord.updateMany(
      {
        studentId: new Types.ObjectId(studentId),
        skill: normalizedSkill,
        resolved: false,
      },
      {
        $set: {
          resolved: true,
          resolvedAt: new Date(),
        },
      },
    )
  },
}
