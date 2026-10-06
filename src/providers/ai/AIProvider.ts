import { AIStructuredResponse } from '../../types'

export interface MissJulieContext {
  studentName: string
  grade: number
  avatarType?: 'BOY' | 'GIRL'
  levelTitle: string
  lessonTitle: string
  activityTitle?: string
  activityTarget?: string
  recentMistakes: string[]
  memoryFacts: string[]
  learningEvidence?: string[]
  promptContext: string
  studentMessage: string
  unitNumber?: number
  stage?: string
  allowedVocabulary?: string[]
  learningObjectives?: string[]
  conversationHistory?: string[]
  requiredConcepts?: string[]
  achievedConcepts?: string[]
  remainingConcepts?: string[]
  hintLevel?: number
  waitingForRetry?: boolean
  retryTargetSkill?: string
  recentJulieOpeners?: string[]
  digitalType?: string
  julieProfile?: Record<string, string>
}

export function unitTeachingGuidance(
  context: Pick<MissJulieContext, 'grade' | 'unitNumber'>,
): string | undefined {
  if (context.grade !== 4) return undefined

  if (context.unitNumber === 1) {
    return 'Unit 1 — My Favourite Things: practise the learner talking about their own favourites, giving simple reasons, asking follow-up questions, and responding kindly when preferences differ. Do not switch this lesson into collecting a partner profile, making a poster, or presenting a partner.'
  }

  if (context.unitNumber === 2) {
    return 'Unit 2 — All About My Partner: focus on interviewing a partner for their name, age, favourite food, after-school activity, hobby, and best friend; checking notes with a follow-up question; organising only verified facts into full-sentence poster lines; and presenting those facts clearly using he/she. Never invent a real partner’s details. In a role-play, use only the supplied partner profile.'
  }

  return undefined
}

export interface AIProvider {
  name: string
  generate(context: MissJulieContext): Promise<AIStructuredResponse>
}
