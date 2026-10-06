import { env } from '../../config/env'
import { PronunciationProvider } from './PronunciationProvider'

export class PythonPronunciationProvider implements PronunciationProvider {
  name = 'python-speech-coach-v1'
  async evaluate(input: { word: string; transcript: string }) {
    const response = await fetch(`${env.aiServiceUrl.replace(/\/$/, '')}/v1/pronunciation/evaluate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedPhrase: input.word, transcript: input.transcript }),
    })
    if (!response.ok) return { score: null, errors: [], feedback: 'Speech coaching is unavailable. Please try again.', available: false }
    const result = await response.json() as {
      sentenceCompleteness: number
      sentenceSimilarity: number
      correctWords: string[]
      wrongWords: string[]
      missingWords: string[]
      extraWords: string[]
      wordOrderMatched: boolean
      feedback: string
      isAcousticPronunciationScore: false
    }
    return {
      score: result.sentenceCompleteness,
      errors: result.missingWords.map((word) => `Try again: ${word}`),
      feedback: result.feedback,
      available: true,
      correctWords: result.correctWords,
      wrongWords: result.wrongWords,
      missingWords: result.missingWords,
      extraWords: result.extraWords,
      wordOrderMatched: result.wordOrderMatched,
      sentenceSimilarity: result.sentenceSimilarity,
      isAcousticPronunciationScore: false as const,
    }
  }
}
