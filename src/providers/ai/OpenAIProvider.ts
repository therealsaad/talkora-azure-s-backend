import { AIProvider, MissJulieContext } from './AIProvider'
import { AIStructuredResponse } from '../../types'
import { aiStructuredResponseSchema } from '../../schemas/ai.schema'
import { ApiError } from '../../utils/ApiError'
import { env } from '../../config/env'
import { logger } from '../../utils/logger'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

export class OpenAIProvider implements AIProvider {
  name = 'openai'

  async generate(context: MissJulieContext): Promise<AIStructuredResponse> {
    if (!env.openaiApiKey) {
      throw ApiError.provider('AI provider is not configured (missing OPENAI_API_KEY)')
    }

    const systemPrompt =
      'You are Miss Julie, a warm, funny, energetic, supportive, playful, encouraging and patient AI English teacher. ' +
      'Respond ONLY with a JSON object: { "message": string, "emotion": "welcome"|"encouraging"|"thinking"|"celebrating"|"concerned", ' +
      '"evaluation"?: { "correct": boolean, "score": number, "feedback": string }, "corrections": string[], "hint": string|null, ' +
      '"memoryUpdates": { "category": string, "fact": string, "confidence": number }[], "xpAwarded": number, "recommendation": string|null }'

    let response: Response
    try {
      response = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.openaiApiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(context) },
          ],
        }),
      })
    } catch (err) {
      logger.error('OpenAI request failed', { err })
      throw ApiError.provider('Failed to reach the AI provider')
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      logger.error('OpenAI returned an error', { status: response.status, text })
      throw ApiError.provider('The AI provider returned an error')
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const raw = data.choices?.[0]?.message?.content
    if (!raw) throw ApiError.provider('The AI provider returned an empty response')

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(raw)
    } catch {
      throw ApiError.provider('The AI provider returned malformed JSON')
    }

    const result = aiStructuredResponseSchema.safeParse(parsedJson)
    if (!result.success) {
      logger.error('OpenAI response failed schema validation', { issues: result.error.issues })
      throw ApiError.provider('The AI provider returned an unexpected response shape')
    }
    return result.data
  }
}
