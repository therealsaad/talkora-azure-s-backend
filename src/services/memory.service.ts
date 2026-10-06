import { Types } from 'mongoose'
import { StudentMemory } from '../models/StudentMemory'

export type PersonalMemoryCandidate = {
  key:
    | 'favouriteFood'
    | 'favouriteSport'
    | 'favouriteSubject'
    | 'favouritePlace'
    | 'favouriteAnimal'
    | 'favouriteFestival'
    | 'hobby'
    | 'afterSchoolActivity'
  value: string
  confidence: number
}

export type LearningMemoryCandidate = {
  skill: string
  support: 'INDEPENDENT' | 'SUPPORTED'
  utterance: string
  turn: number
}

const LABELS: Record<PersonalMemoryCandidate['key'], string> = {
  favouriteFood: 'Favourite food',
  favouriteSport: 'Favourite sport',
  favouriteSubject: 'Favourite subject',
  favouritePlace: 'Favourite place',
  favouriteAnimal: 'Favourite animal',
  favouriteFestival: 'Favourite festival',
  hobby: 'Hobby',
  afterSchoolActivity: 'After-school activity',
}

const CONCEPT_KEYS: Record<string, PersonalMemoryCandidate['key'][]> = {
  favourite_food: ['favouriteFood'],
  favourite_sport: ['favouriteSport'],
  favourite_subject: ['favouriteSubject'],
  favourite_place: ['favouritePlace'],
  favourite_animal: ['favouriteAnimal'],
  favourite_festival: ['favouriteFestival'],
  extended_favourite: ['favouritePlace', 'favouriteAnimal', 'favouriteFestival'],
}

const NOISE_WORDS = new Set(['yes', 'no', 'yeah', 'ok', 'okay', 'sure', 'fine', 'good', 'hello', 'hi', 'nothing', 'bye', 'thank you', 'thanks'])

function cleanValue(value: string) {
  return value
    .replace(/[^\p{L}\p{N} .,'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

export function extractVerifiedPersonalFacts(transcript: string): PersonalMemoryCandidate[] {
  const facts: PersonalMemoryCandidate[] = []
  const favourite = /\bmy favou?rite (food|sport|subject|place|animal|festival) is\s+([^.!?\n\r]+?)(?=(?:\s+and\s+my\b|\s+my\b|[.!?]|$))/gi
  for (const match of transcript.matchAll(favourite)) {
    const kind = match[1]!
    const value = cleanValue(match[2]!)
    const suffix = kind[0]!.toUpperCase() + kind.slice(1).toLowerCase()
    if (value && !NOISE_WORDS.has(value.toLowerCase())) {
      facts.push({
        key: `favourite${suffix}` as PersonalMemoryCandidate['key'],
        value,
        confidence: 0.92,
      })
    }
  }
  const hobby = transcript.match(/\bmy hobby is\s+([^.!?\n\r]+?)(?=(?:\s+and\s+my\b|\s+my\b|[.!?]|$))/i)
  if (hobby?.[1]) {
    const val = cleanValue(hobby[1])
    if (val && !NOISE_WORDS.has(val.toLowerCase())) {
      facts.push({ key: 'hobby', value: val, confidence: 0.9 })
    }
  }
  const afterSchool = transcript.match(/\bafter school(?:,)? i\s+([^.!?\n\r]+?)(?=(?:\s+and\s+my\b|\s+my\b|[.!?]|$))/i)
  if (afterSchool?.[1]) {
    const val = cleanValue(afterSchool[1])
    if (val && !NOISE_WORDS.has(val.toLowerCase())) {
      facts.push({ key: 'afterSchoolActivity', value: val, confidence: 0.86 })
    }
  }
  return facts.filter((fact) => fact.value.length >= 2)
}

export function relevantMemoryKeys(requiredConcepts: string[]) {
  const keys = new Set<PersonalMemoryCandidate['key']>()
  requiredConcepts.forEach((concept) =>
    CONCEPT_KEYS[concept]?.forEach((key) => keys.add(key)),
  )
  return keys
}

export const MemoryService = {
  async listForStudent(studentId: string) {
    return StudentMemory.find({ studentId })
      .sort('-lastReinforcedAt')
      .lean()
  },

  async relevantPersonalFacts(studentId: string, requiredConcepts: string[]) {
    const keys = relevantMemoryKeys(requiredConcepts)
    const query: Record<string, unknown> = {
      studentId,
      category: 'preference',
      confidence: { $gte: 0.7 },
    }
    if (keys.size > 0) {
      query.key = { $in: [...keys] }
    }
    return StudentMemory.find(query).sort('-lastReinforcedAt').limit(6).lean()
  },

  async relevantLearningEvidence(studentId: string, requiredConcepts: string[]) {
    const query: Record<string, unknown> = {
      studentId,
      category: { $in: ['speaking', 'grammar', 'pronunciation', 'vocabulary', 'behavior'] },
      confidence: { $gte: 0.55 },
    }
    if (requiredConcepts.length > 0) {
      query.key = { $in: requiredConcepts.map((concept) => `learning:${concept}`) }
    }
    return StudentMemory.find(query).sort('-lastReinforcedAt').limit(8).lean()
  },

  async persistVerifiedPersonalFacts(input: {
    studentId: string
    transcript: string
    inputMode: 'OPTION' | 'MIC' | 'TEXT'
    activityId?: string
    conversationId: string
    turn: number
  }) {
    if (input.inputMode === 'OPTION') return []
    const candidates = extractVerifiedPersonalFacts(input.transcript)
    return Promise.all(
      candidates.map((candidate) =>
        StudentMemory.findOneAndUpdate(
          { studentId: input.studentId, key: candidate.key },
          {
            $set: {
              value: candidate.value,
              category: 'preference',
              fact: `${LABELS[candidate.key]}: ${candidate.value}`,
              confidence: candidate.confidence,
              lastReinforcedAt: new Date(),
              source: 'system',
              sourceActivityId: input.activityId
                ? new Types.ObjectId(input.activityId)
                : undefined,
              sourceConversationId: new Types.ObjectId(input.conversationId),
              sourceTurn: input.turn,
              sourceTranscript: input.transcript.slice(0, 500),
            },
            $inc: { timesObserved: 1 },
            $setOnInsert: {
              studentId: new Types.ObjectId(input.studentId),
              key: candidate.key,
              firstLearnedAt: new Date(),
            },
          },
          { upsert: true, new: true },
        ),
      ),
    )
  },

  async persistLearningEvidence(input: {
    studentId: string
    activityId?: string
    conversationId: string
    evidence: LearningMemoryCandidate[]
  }) {
    return Promise.all(
      input.evidence.map((item) => {
        const confidence = item.support === 'INDEPENDENT' ? 0.85 : 0.65
        const category = /pronunciation|sentence|speaking|question|reason/.test(item.skill)
          ? 'speaking'
          : /vocabulary|word/.test(item.skill)
            ? 'vocabulary'
            : 'grammar'

        return StudentMemory.findOneAndUpdate(
          { studentId: input.studentId, key: `learning:${item.skill}` },
          {
            $set: {
              value: item.support,
              category,
              fact: `${item.skill}: ${item.support.toLowerCase()}`,
              confidence,
              lastReinforcedAt: new Date(),
              source: 'system',
              sourceActivityId: input.activityId
                ? new Types.ObjectId(input.activityId)
                : undefined,
              sourceConversationId: new Types.ObjectId(input.conversationId),
              sourceTurn: item.turn,
              sourceTranscript: item.utterance.slice(0, 500),
            },
            $inc: { timesObserved: 1 },
            $setOnInsert: {
              studentId: new Types.ObjectId(input.studentId),
              key: `learning:${item.skill}`,
              firstLearnedAt: new Date(),
            },
          },
          { upsert: true, new: true },
        )
      }),
    )
  },

  /**
   * Applies and validates AI-suggested memory updates.
   * Performs noise rejection, deduplication, and confidence evolution.
   */
  async applyMemorySuggestions(input: {
    studentId: string
    suggestions: Array<{
      key?: string
      value?: string
      category: string
      confidence: number
    }>
    conversationId?: string
    activityId?: string
    turn?: number
    transcript?: string
  }) {
    const validCategories = new Set([
      'preference',
      'vocabulary',
      'grammar',
      'pronunciation',
      'speaking',
      'behavior',
    ])

    const results = []
    for (const item of input.suggestions) {
      if (!validCategories.has(item.category)) continue
      if (!item.value || item.value.trim().length < 2) continue

      const cleanedVal = cleanValue(item.value)
      if (NOISE_WORDS.has(cleanedVal.toLowerCase())) continue
      if (item.confidence < 0.6) continue

      const key = item.key
        ? item.key.trim()
        : `${item.category}:${cleanedVal.toLowerCase().replace(/\s+/g, '_')}`

      const memory = await StudentMemory.findOneAndUpdate(
        { studentId: input.studentId, key },
        {
          $set: {
            value: cleanedVal,
            category: item.category as any,
            fact: `${key}: ${cleanedVal}`,
            confidence: Math.min(1, Math.max(0.6, item.confidence)),
            lastReinforcedAt: new Date(),
            source: 'ai',
            sourceActivityId: input.activityId
              ? new Types.ObjectId(input.activityId)
              : undefined,
            sourceConversationId: input.conversationId
              ? new Types.ObjectId(input.conversationId)
              : undefined,
            sourceTurn: input.turn,
            sourceTranscript: input.transcript?.slice(0, 500),
          },
          $inc: { timesObserved: 1 },
          $setOnInsert: {
            studentId: new Types.ObjectId(input.studentId),
            key,
            firstLearnedAt: new Date(),
          },
        },
        { upsert: true, new: true },
      )
      results.push(memory)
    }

    return results
  },
}
