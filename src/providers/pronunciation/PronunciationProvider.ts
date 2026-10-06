export interface PronunciationProvider {
  name: string
  evaluate(input: { word: string; transcript: string }): Promise<{
    score: number | null
    errors: string[]
    feedback: string
    available: boolean
    correctWords?: string[]
    wrongWords?: string[]
    missingWords?: string[]
    extraWords?: string[]
    wordOrderMatched?: boolean
    sentenceSimilarity?: number
    isAcousticPronunciationScore?: false
  }>
}
