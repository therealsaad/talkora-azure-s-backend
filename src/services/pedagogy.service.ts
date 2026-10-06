export type SupportLevel = 'INDEPENDENT' | 'SUPPORTED'

export interface SkillEvidence {
  skill: string
  support: SupportLevel
  utterance: string
  turn: number
}

export const JULIE_UNIT1_PROFILE = Object.freeze({
  favouriteFood: 'idli',
  favouriteSport: 'badminton',
  favouriteSubject: 'English',
  favouritePlace: 'the library',
  favouriteAnimal: 'elephant',
  favouriteFestival: 'Diwali',
})

export interface RetryState {
  waiting: boolean
  targetSkill: string
  attempt: number
  hintLevel: number
  originalUtterance: string
  modelSentence?: string
}

const questionStart = /^(what|which|who|why|how|where|when|can|could|do|does|is|are)\b/i

export function isVerifiedStudentMemory(message: string, value: string) {
  const normalize = (text: string) => text.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const claim = normalize(value)
  return Boolean(claim && normalize(message).includes(claim))
}

export function detectStudentSkills(message: string): string[] {
  const text = message.trim().toLowerCase()
  const skills: string[] = []
  const words = text.match(/[a-z']+/g) || []

  if (words.length >= 4) skills.push('full_sentence')
  if (/\bmy name is\s+[a-z][a-z'-]*(?:\s+[a-z][a-z'-]*)*/.test(text)) skills.push('name')
  if (/\bmy favou?rite food is\s+[^.!?]+/.test(text)) skills.push('favourite_food')
  if (/\b(favou?rite sport|like (cricket|football|badminton|basketball|hockey|kho-kho))\b/.test(text)) skills.push('favourite_sport')
  if (/\b(with (my )?\w+|i play .+ with .+)\b/.test(text)) skills.push('sport_company')
  if (/\bbecause\s+(it is|it's|i |we |playing |the |[a-z]+ is\b)/.test(text)) skills.push('give_reason', 'sport_reason')
  if (/\b(favou?rite subject|english|maths?|science|evs|physical education)\b/.test(text)) skills.push('favourite_subject')
  if (/\bmy favou?rite place is\s+[^.!?]+|\b(nani'?s house|playground|park|library|zoo)\b/.test(text)) skills.push('favourite_place', 'extended_favourite')
  if (/\bmy favou?rite animal is\s+[^.!?]+|\b(cat|dog|tiger|lion|elephant|rabbit)\b/.test(text)) skills.push('favourite_animal', 'extended_favourite')
  if (/\bmy favou?rite festival is\s+[^.!?]+|\b(eid|diwali|holi|onam|christmas)\b/.test(text)) skills.push('favourite_festival', 'extended_favourite')
  if (/\b(i like|i play|i go|i sing)\b.*\b(there|with|at)\b/.test(text)) skills.push('expanded_detail')
  if (/\b(we both like|we like different|different favou?rites|you like .+ (and|but) i like|that'?s (nice|okay)|sounds fun)\b/.test(text)) skills.push('compare_favourites', 'respect_difference')
  if (/\b(favou?rite subject|english|maths?|science|evs|physical education)\b.*\bbecause\b|\bbecause\b.*\b(story|stories|sums|problems|experiments|writing|games|exercise)\b/.test(text)) skills.push('subject_reason')

  if (text.includes('?') || questionStart.test(text)) {
    skills.push('ask_julie_question')
    if (/\b(favou?rite|like.+(best|most)|what (food|sport|subject)|which (food|sport|subject))\b/.test(text)) skills.push('ask_favourite_question')
    if (/\b(food|which food)\b/.test(text)) skills.push('ask_favourite_food')
    if (/\b(sport|which sport)\b/.test(text)) skills.push('ask_favourite_sport')
    if (/\b(subject|which subject)\b/.test(text)) skills.push('ask_favourite_subject')
    if (/^(why|who|how|where|what else|can you tell me more)\b/.test(text)) skills.push('ask_follow_up_question')
  }

  return [...new Set(skills)]
}

export function mergeEvidence(
  prior: SkillEvidence[],
  detected: string[],
  message: string,
  turn: number,
  retry?: RetryState,
  inputMode: 'OPTION' | 'MIC' | 'TEXT' = 'TEXT',
): SkillEvidence[] {
  const support: SupportLevel = retry?.waiting || inputMode === 'OPTION' ? 'SUPPORTED' : 'INDEPENDENT'
  const producible = inputMode === 'OPTION'
    ? detected.filter((skill) => !skill.startsWith('ask_'))
    : detected
  const accepted = retry?.waiting ? producible.filter((skill) => skill === retry.targetSkill || skill === 'full_sentence') : producible
  const next = [...prior]
  for (const skill of accepted) {
    const existing = next.find((item) => item.skill === skill)
    if (!existing || (existing.support === 'SUPPORTED' && support === 'INDEPENDENT')) {
      if (existing) next.splice(next.indexOf(existing), 1)
      next.push({ skill, support, utterance: message.slice(0, 300), turn })
    }
  }
  return next
}

export function extractPersonalFavourite(message: string) {
  const match = message.match(/\bmy favou?rite (food|sport|subject|place|animal|festival) is\s+([^.!?]+)/i)
  if (!match) return null
  const suffix = match[1]![0]!.toUpperCase() + match[1]!.slice(1).toLowerCase()
  return { key: `favourite${suffix}`, value: match[2]!.trim(), sourceTranscript: message }
}

export function classifyLearnerQuestion(message: string) {
  const text = message.trim().toLowerCase().replace(/[?.!]+$/, '')
  if (/what (does|do) (favou?rite|subject|exciting) mean|what is the meaning of/.test(text)) return 'CLARIFICATION' as const
  if (/^(why|who|what|which|when|where|how)\b/.test(text) && /\b(favou?rite|like|play|go|do)\b/.test(text)) return 'LESSON_FOLLOW_UP' as const
  if (/^(do|are|can|what|which|why|who|when|where|how)\b/.test(text)) return 'MILD_OFF_TOPIC' as const
  return 'NOT_A_QUESTION' as const
}

export function compareWithJulie(key: keyof typeof JULIE_UNIT1_PROFILE, studentValue: string) {
  const julieValue = JULIE_UNIT1_PROFILE[key]
  const same = studentValue.trim().toLowerCase() === julieValue.toLowerCase()
  return { same, correct: true, julieValue, studentValue, pattern: same ? `We both like ${studentValue}.` : 'We have different favourites.' }
}

export function masteryFor(required: string[], evidence: SkillEvidence[], bounded: boolean) {
  const bySkill = new Map(evidence.map((item) => [item.skill, item]))
  const allPresent = required.every((skill) => bySkill.has(skill))
  if (allPresent) {
    return [...bySkill.values()].some((item) => required.includes(item.skill) && item.support === 'SUPPORTED')
      ? 'COMPLETED_WITH_SUPPORT' as const
      : 'MASTERED' as const
  }
  return bounded ? 'NEEDS_PRACTICE' as const : 'IN_PROGRESS' as const
}

export function nextRetryState(input: {
  previous?: RetryState
  shouldRetry: boolean
  hintLevel?: number
  targetSkill?: string
  originalUtterance: string
  modelSentence?: string | null
}): RetryState | undefined {
  if (!input.shouldRetry) return undefined
  return {
    waiting: true,
    targetSkill: input.previous?.targetSkill || input.targetSkill || 'full_sentence',
    attempt: (input.previous?.attempt || 0) + 1,
    hintLevel: Math.min(3, Math.max(input.previous?.hintLevel || 0, input.hintLevel || 1)),
    originalUtterance: input.previous?.originalUtterance || input.originalUtterance,
    modelSentence: input.modelSentence || input.previous?.modelSentence,
  }
}
