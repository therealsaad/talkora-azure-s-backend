import { AIProvider, MissJulieContext } from './AIProvider'
import { AIStructuredResponse } from '../../types'

/** Deterministic, offline provider for local development and tests. Never used in production. */
export class MockAIProvider implements AIProvider {
  name = 'mock'

  async generate(context: MissJulieContext): Promise<AIStructuredResponse> {
    const struggling = context.recentMistakes.length > 0
    return {
      message: struggling
        ? `Great try, ${context.studentName}! Let's practice "${context.activityTarget ?? context.lessonTitle}" one more time together.`
        : `Wonderful work, ${context.studentName}! You're doing great in ${context.lessonTitle}.`,
      emotion: struggling ? 'encouraging' : 'celebrating',
      evaluation: { correct: !struggling, score: struggling ? 60 : 95, feedback: 'Development fallback response (mock AI provider).' },
      corrections: [],
      hint: struggling ? `Try saying it slowly, one part at a time.` : null,
      memoryUpdates: [],
      xpAwarded: struggling ? 5 : 10,
      recommendation: null,
    }
  }
}
