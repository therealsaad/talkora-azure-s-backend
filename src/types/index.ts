export interface AIStructuredResponse {
  message: string
  emotion:
    | 'greeting'
    | 'welcome'
    | 'curious'
    | 'listening'
    | 'thinking'
    | 'delighted'
    | 'encouraging'
    | 'gentle_correction'
    | 'modeling'
    | 'proud'
    | 'surprised'
    | 'retry'
    | 'gentle_retry'
    | 'hinting'
    | 'celebrating'
    | 'concerned'
  responseQuality?: 'STRONG' | 'ADEQUATE' | 'PARTIAL' | 'UNCLEAR'
  evaluation?: {
    correct: boolean
    score: number
    feedback: string
  }
  corrections: string[]
  correction?: { needed: boolean; original: string; corrected: string; explanation: string }
  hint?: string | null
  followUpQuestion?: string | null
  memoryUpdates: Array<{ key?: string; value: string; category: string; confidence: number }>
  xpAwarded: number
  recommendation?: string | null
  teachingAction?: string | null
  modelSentence?: string | null
  activityComplete?: boolean
  shouldRetry?: boolean
  hintLevel?: number
  detectedSkills?: string[]
  remainingSkills?: string[]
}
