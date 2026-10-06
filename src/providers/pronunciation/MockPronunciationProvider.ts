import { PronunciationProvider } from './PronunciationProvider'

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

export class MockPronunciationProvider implements PronunciationProvider {
  name = 'smart-local-evaluator'

  async evaluate(input: { word: string; transcript: string }) {
    const target = normalize(input.word)
    const spoken = normalize(input.transcript)

    if (!spoken) {
      return {
        score: 0,
        errors: ['No speech detected'],
        feedback: "I didn't hear anything. Try holding the microphone button and speaking clearly!",
        available: true,
      }
    }

    if (target === spoken) {
      return {
        score: 100,
        errors: [],
        feedback: 'Fantastic pronunciation! You said it crystal clear.',
        available: true,
      }
    }

    const targetWords = target.split(/\s+/).filter(Boolean)
    const spokenWords = spoken.split(/\s+/).filter(Boolean)

    const errors: string[] = []
    let matchedWordCount = 0

    for (const tw of targetWords) {
      const match = spokenWords.find((sw) => sw === tw || levenshteinDistance(sw, tw) <= 1)
      if (match) {
        matchedWordCount++
      } else {
        errors.push(`Missing or mispronounced: "${tw}"`)
      }
    }

    const maxLen = Math.max(target.length, spoken.length)
    const distance = levenshteinDistance(target, spoken)
    const charSimilarity = Math.max(0, 1 - distance / maxLen)
    const wordSimilarity = targetWords.length > 0 ? matchedWordCount / targetWords.length : 0

    const rawScore = Math.round((charSimilarity * 0.4 + wordSimilarity * 0.6) * 100)
    const score = Math.min(100, Math.max(10, rawScore))

    let feedback = ''
    if (score >= 85) {
      feedback = 'Great job! That sounded almost perfect.'
    } else if (score >= 60) {
      feedback = `Nice try! You're getting closer. Listen carefully to "${input.word}" and try again.`
    } else {
      feedback = `Good effort! Remember to say: "${input.word}". Take your time!`
    }

    return {
      score,
      errors,
      feedback,
      available: true,
    }
  }
}

