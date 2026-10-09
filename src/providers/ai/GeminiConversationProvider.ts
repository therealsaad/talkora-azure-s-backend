import { env } from '../../config/env'
import { aiStructuredResponseSchema } from '../../schemas/ai.schema'
import { AIStructuredResponse } from '../../types'
import { ApiError } from '../../utils/ApiError'
import { logger } from '../../utils/logger'
import { AIProvider, MissJulieContext, unitTeachingGuidance } from './AIProvider'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const MAX_ATTEMPTS_PER_MODEL = 2
const RETRY_BASE_DELAY_MS = 250

function waitBeforeRetry(attempt: number): Promise<void> {
  const exponentialDelay = RETRY_BASE_DELAY_MS * (2 ** attempt)
  const jitter = Math.floor(Math.random() * RETRY_BASE_DELAY_MS)
  return new Promise((resolve) => setTimeout(resolve, exponentialDelay + jitter))
}

function buildConversationPrompt(context: MissJulieContext): string {
  const unitGuidance = unitTeachingGuidance(context)
  return JSON.stringify({
    student: {
      name: context.studentName,
      grade: context.grade,
    },
    conversation: context.conversationHistory?.slice(-8) || [],
    learning: {
      unit: context.levelTitle,
      lesson: context.lessonTitle,
      activity: context.activityTitle,
      currentQuestion: context.activityTarget,
      objectives: unitGuidance
        ? [...(context.learningObjectives || []), unitGuidance]
        : context.learningObjectives,
      allowedVocabulary: context.allowedVocabulary,
    },
    knownFacts: context.memoryFacts,
    recentMistakes: context.recentMistakes,
    latestStudentMessage: context.studentMessage,
    responseRequirements: {
      language: 'Simple, friendly English suited to a school child.',
      teaching: 'Respond to the latest student message specifically. Praise a useful detail, gently model one correction only if needed, and ask one short relevant follow-up.',
      conversation: 'Do not use a stock reply, repeat a question already answered, invent personal facts, or shame the learner.',
      responseShape: {
        message: 'A short natural reaction without a question.',
        emotion: 'One of greeting, welcome, curious, listening, thinking, delighted, encouraging, gentle_correction, modeling, proud, surprised, retry, gentle_retry, hinting, celebrating, concerned.',
        responseQuality: 'STRONG, ADEQUATE, PARTIAL, or UNCLEAR.',
        corrections: [],
        correction: {
          needed: false,
          original: '',
          corrected: '',
          explanation: '',
        },
        hint: null,
        followUpQuestion: 'One relevant question, or null.',
        memoryUpdates: [],
        teachingAction: 'CONTINUE_CONVERSATION, GENTLE_CORRECTION, MODEL_SENTENCE, ASK_FOLLOW_UP, GIVE_HINT, or another supported teaching action.',
        modelSentence: null,
        shouldRetry: false,
        hintLevel: 0,
      },
    },
  })
}

const SYSTEM_INSTRUCTION = [
  'You are Miss Julie, a warm, patient English teacher speaking with one school child.',
  'Teach English through a real conversation. Listen to the learner’s latest answer, respond to its meaning, and help them express the idea clearly.',
  'Keep the reaction kind and specific. Correct only a real mistake, model a natural full sentence when it helps, then ask one useful follow-up question.',
  'Use simple English, avoid repeated generic praise and repeated questions, and never invent personal information.',
  'Return exactly one JSON object matching the response schema. Do not include markdown.',
].join(' ')

const CONVERSATION_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    message: { type: 'STRING' },
    emotion: {
      type: 'STRING',
      enum: [
        'greeting',
        'welcome',
        'curious',
        'listening',
        'thinking',
        'delighted',
        'encouraging',
        'gentle_correction',
        'modeling',
        'proud',
        'surprised',
        'retry',
        'gentle_retry',
        'hinting',
        'celebrating',
        'concerned',
      ],
    },
    responseQuality: {
      type: 'STRING',
      enum: ['STRONG', 'ADEQUATE', 'PARTIAL', 'UNCLEAR'],
    },
    corrections: { type: 'ARRAY', items: { type: 'STRING' } },
    correction: {
      type: 'OBJECT',
      properties: {
        needed: { type: 'BOOLEAN' },
        original: { type: 'STRING' },
        corrected: { type: 'STRING' },
        explanation: { type: 'STRING' },
      },
      required: ['needed', 'original', 'corrected', 'explanation'],
    },
    hint: { type: 'STRING', nullable: true },
    followUpQuestion: { type: 'STRING', nullable: true },
    memoryUpdates: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          key: { type: 'STRING' },
          value: { type: 'STRING' },
          category: {
            type: 'STRING',
            enum: ['preference', 'vocabulary', 'grammar', 'pronunciation', 'speaking', 'behavior'],
          },
          confidence: { type: 'NUMBER' },
        },
        required: ['value', 'category', 'confidence'],
      },
    },
    teachingAction: {
      type: 'STRING',
      enum: [
        'CONTINUE_CONVERSATION',
        'ACKNOWLEDGE',
        'GENTLE_CORRECTION',
        'MODEL_FULL_SENTENCE',
        'MODEL_SENTENCE',
        'WAIT_FOR_REPEAT',
        'ASK_FOLLOW_UP',
        'PROMPT_STUDENT_QUESTION',
        'GIVE_HINT',
        'CELEBRATE_IMPROVEMENT',
        'CLARIFY',
        'COMPLETE_EPISODE',
        'CONTINUE',
        'RETRY',
        'OFFER_OPTIONS',
        'COMPLETE',
      ],
      nullable: true,
    },
    modelSentence: { type: 'STRING', nullable: true },
    shouldRetry: { type: 'BOOLEAN' },
    hintLevel: { type: 'INTEGER' },
  },
  required: [
    'message',
    'emotion',
    'responseQuality',
    'corrections',
    'correction',
    'hint',
    'followUpQuestion',
    'memoryUpdates',
    'teachingAction',
    'modelSentence',
    'shouldRetry',
    'hintLevel',
  ],
}

function parseConversationJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')

  try {
    return JSON.parse(cleaned)
  } catch (error) {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start < 0 || end <= start) throw error
    return JSON.parse(cleaned.slice(start, end + 1))
  }
}

export class GeminiConversationProvider implements AIProvider {
  name = 'gemini-conversation'

  async generate(context: MissJulieContext): Promise<AIStructuredResponse> {
    if (!env.geminiApiKey) {
      throw ApiError.provider('Talkora AI is not configured (missing GEMINI_API_KEY)')
    }

    const models = [...new Set([env.geminiModel, env.geminiFallbackModel].filter(Boolean))]
    let lastStatus: number | undefined
    let lastNetworkError: unknown

    for (const [index, model] of models.entries()) {
      for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt += 1) {
        let response: Response
        try {
          response = await fetch(
            `${GEMINI_URL}/${encodeURIComponent(model)}:generateContent`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': env.geminiApiKey,
              },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{ text: SYSTEM_INSTRUCTION }],
                },
                contents: [{
                  role: 'user',
                  parts: [{ text: buildConversationPrompt(context) }],
                }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 1200,
                  responseMimeType: 'application/json',
                  responseSchema: CONVERSATION_RESPONSE_SCHEMA,
                },
              }),
              signal: AbortSignal.timeout(env.aiServiceTimeoutMs),
            },
          )
        } catch (error) {
          lastNetworkError = error
          logger.warn('Gemini conversation request failed', {
            model,
            attempt: attempt + 1,
            error: error instanceof Error ? error.message : error,
          })

          if (attempt + 1 < MAX_ATTEMPTS_PER_MODEL) {
            await waitBeforeRetry(attempt)
            continue
          }
          if (index + 1 < models.length) break
          throw ApiError.provider('Miss Julie could not reach the configured Gemini API after retrying.')
        }
        lastNetworkError = undefined

        if (!response.ok) {
          lastStatus = response.status
          const providerError = await response.json().catch(() => null) as {
            error?: {
              status?: string
              code?: number | string
              message?: string
            }
          } | null
          logger.error('Gemini conversation provider returned an error', {
            model,
            attempt: attempt + 1,
            status: response.status,
            providerStatus: providerError?.error?.status,
            providerCode: providerError?.error?.code,
          })

          if (response.status === 429) {
            throw ApiError.rateLimited('Talkora AI has reached a Gemini API quota or rate limit. Try again later.')
          }

          const isTransient = response.status === 408 || response.status >= 500
          if (isTransient && attempt + 1 < MAX_ATTEMPTS_PER_MODEL) {
            await waitBeforeRetry(attempt)
            continue
          }

          const canTryNextModel =
            index + 1 < models.length &&
            (isTransient || response.status === 404)
          if (canTryNextModel) break

          throw ApiError.provider(
            response.status === 401 ||
            response.status === 403 ||
            providerError?.error?.status === 'UNAUTHENTICATED' ||
            /api key.{0,30}(not valid|invalid)|invalid api key/i.test(
              providerError?.error?.message || '',
            )
              ? 'The configured Gemini API rejected its key. Check GEMINI_API_KEY.'
              : `The configured Gemini API could not answer (HTTP ${response.status}).`,
          )
        }

        let payload: {
          candidates?: Array<{
            finishReason?: string
            content?: {
              parts?: Array<{ text?: string }>
            }
          }>
        }
        try {
          payload = await response.json() as typeof payload
        } catch (error) {
          logger.error('Gemini conversation provider returned invalid JSON', {
            model,
            attempt: attempt + 1,
            error: error instanceof Error ? error.message : error,
          })
          if (attempt + 1 < MAX_ATTEMPTS_PER_MODEL) {
            await waitBeforeRetry(attempt)
            continue
          }
          if (index + 1 < models.length) break
          throw ApiError.provider('The configured Gemini API returned an invalid conversation response.')
        }
        const raw = payload.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || '')
          .join('')
          .trim()

        if (!raw) {
          logger.error('Gemini conversation provider returned no text', {
            model,
            finishReason: payload.candidates?.[0]?.finishReason,
          })
          throw ApiError.provider('The configured Gemini API returned an empty conversation response.')
        }

        let parsed: unknown
        try {
          parsed = parseConversationJson(raw)
        } catch (error) {
          logger.error('Gemini conversation provider returned malformed JSON', {
            model,
            attempt: attempt + 1,
            finishReason: payload.candidates?.[0]?.finishReason,
            error: error instanceof Error ? error.message : error,
            responseLength: raw.length,
          })
          if (attempt + 1 < MAX_ATTEMPTS_PER_MODEL) {
            await waitBeforeRetry(attempt)
            continue
          }
          if (index + 1 < models.length) break
          throw ApiError.provider('The configured Gemini API returned an invalid conversation response.')
        }

        const result = aiStructuredResponseSchema.safeParse(parsed)
        if (!result.success) {
          logger.error('Gemini conversation response failed schema validation', {
            model,
            issues: result.error.issues,
          })
          throw ApiError.provider('The configured Gemini API returned an unsupported conversation response.')
        }

        return result.data
      }
    }

    if (lastNetworkError) {
      throw ApiError.provider('Miss Julie could not reach the configured Gemini API after retrying.')
    }

    throw ApiError.provider(
      `The configured Gemini API could not answer${lastStatus ? ` (HTTP ${lastStatus})` : ''}.`,
    )
  }
}
