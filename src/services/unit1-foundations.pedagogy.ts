export const UNIT1_WARMUP_ITEMS = [
  'playing cricket',
  'singing',
  'eating cake',
  'doing homework',
  'eating red chilli',
  'running races',
] as const

export type PreferenceEvidence = 'SUPPORTED' | 'INDEPENDENT'

export function preferenceTarget(item: string, likes: boolean) {
  return `I ${likes ? 'like' : "don't like"} ${item}.`
}

export function warmupScaffold(index: number) {
  if (index === 0) return 'FULL_MODEL' as const
  if (index === 1) return 'SENTENCE_STARTER' as const
  if (index === 2) return 'LIGHT_PROMPT' as const
  return 'INDEPENDENT_PROMPT' as const
}

export function productionEvidence(index: number, retries: number): PreferenceEvidence {
  return index >= 3 && retries === 0 ? 'INDEPENDENT' : 'SUPPORTED'
}

export function mayCompleteWarmup(input: {
  spokenCount: number
  independentCount: number
  likeCount: number
  dislikeCount: number
  choseAnyDislike: boolean
}) {
  return input.spokenCount >= 4 && input.independentCount >= 1 && input.likeCount >= 1 &&
    (!input.choseAnyDislike || input.dislikeCount >= 1)
}

export const UNIT1_MODEL_DIALOGUE = [
  'Hi! What is your name?',
  'My name is Aarav.',
  'What is your favourite food?',
  'My favourite food is noodles.',
  'What food do you like?',
  'I like pizza the best.',
  'What is your favourite sport?',
  'My favourite sport is cricket.',
  'Which school subject do you like the most?',
  'I like English the most.',
] as const

export function repeatSupport(attempt: number) {
  return ['NORMAL', 'SLOW_MODEL', 'VISUAL_CHUNKS', 'MODELED_CHUNKS', 'SUPPORTED_REPEAT'][Math.min(Math.max(attempt - 1, 0), 4)]!
}

export function exactRepeatInput(currentLineId: string, currentExpectedText: string, actualTranscript: string) {
  return { currentLineId, currentExpectedText, actualTranscript }
}
