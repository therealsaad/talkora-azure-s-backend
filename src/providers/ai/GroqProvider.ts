import { AIProvider, MissJulieContext, unitTeachingGuidance } from './AIProvider'
import { AIStructuredResponse } from '../../types'
import { aiStructuredResponseSchema } from '../../schemas/ai.schema'
import { ApiError } from '../../utils/ApiError'
import { env } from '../../config/env'
import { logger } from '../../utils/logger'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export function detectLearnerLanguage(message: string): 'HINDI' | 'URDU' | 'ROMANIZED_HINDUSTANI' | 'ENGLISH_OR_OTHER' {
  if (/[\u0900-\u097F]/.test(message)) return 'HINDI'
  if (/[\u0600-\u06FF]/.test(message)) return 'URDU'
  if (/\b(kaise|kaisi|aap|tum|kya|hai|hain|ho|mera|mujhe|achha|shukriya)\b/i.test(message)) return 'ROMANIZED_HINDUSTANI'
  return 'ENGLISH_OR_OTHER'
}

export function buildSystemPrompt(): string {
  return [
    'You are Miss Julie, a warm English conversation coach for a school child.',
    'You understand Hindi, Urdu, Romanized Hindi/Urdu, and English. The student may switch languages in one sentence. Read what they mean before correcting them.',
    'Speak and write your teacher response in simple English only. Groq English speech will read the exact same response. Never shame a learner for using their home language.',
    'When the child says a Hindi or Urdu phrase such as "kaise ho", briefly teach its English equivalent: "In English, we say: How are you?" Then answer naturally and ask one lesson-related question.',
    'When the child makes an English grammar mistake, give one short corrected English sentence and a kind explanation. Do not invent a mistake when the answer is correct.',
    'Keep message plus followUpQuestion ideally under 180 characters for responsive speech. Preserve the meaning of the child response.',
    'Read the recent conversation. The student just answered the most recent Julie question. Respond to what the student actually said.',
    'Stay within the lesson topic and the remaining learning concepts. Ask ONE short, natural follow-up question. Do not repeat a previous question or switch to an unrelated topic.',
    'If the student answer is unclear, give one gentle hint and ask for a clearer answer to the SAME question. Never invent what the student said.',
    'Return exactly one JSON object, no markdown: {"message":"short reaction without a question","emotion":"encouraging","followUpQuestion":"one short question or null","responseQuality":"ADEQUATE","shouldRetry":false,"hintLevel":0,"modelSentence":null,"teachingAction":"ASK_FOLLOW_UP","corrections":[],"memoryUpdates":[]}.',
    'Valid emotion values: greeting, welcome, curious, listening, thinking, delighted, encouraging, gentle_correction, modeling, proud, surprised, retry, gentle_retry, hinting, celebrating, concerned.',
    'Set shouldRetry true only when a clear retry is needed. If shouldRetry is true, followUpQuestion should repeat or clarify the current question.',
  ].join(' ')
}

function buildUserPrompt(context: MissJulieContext): string {
  const unitGuidance = unitTeachingGuidance(context)
  return JSON.stringify({
    student: context.studentName,
    grade: context.grade,
    level: context.levelTitle,
    lesson: context.lessonTitle,
    activity: context.activityTitle,
    currentQuestion: context.activityTarget,
    activityGoal: context.activityTarget,
    digitalType: context.digitalType,
    julieProfile: context.julieProfile,
    recentConversation: context.conversationHistory?.slice(-8),
    unitTeachingGuidance: unitGuidance,
    remainingConcepts: context.remainingConcepts,
    requiredConcepts: context.requiredConcepts,
    learningObjectives: unitGuidance
      ? [...(context.learningObjectives || []), unitGuidance]
      : context.learningObjectives,
    recentJulieOpeners: context.recentJulieOpeners,
    waitingForRetry: context.waitingForRetry,
    retryTargetSkill: context.retryTargetSkill,
    recentMistakes: context.recentMistakes,
    knownFacts: context.memoryFacts,
    interactionContext: context.promptContext,
    studentMessage: context.studentMessage,
    studentLanguageHint: detectLearnerLanguage(context.studentMessage),
  })
}

export class GroqProvider implements AIProvider {
  name = 'groq'
  constructor(private readonly model = env.conversationGroqModel) {}

  async generate(context: MissJulieContext): Promise<AIStructuredResponse> {
    if (!env.groqApiKey) {
      throw ApiError.provider('AI provider is not configured (missing GROQ_API_KEY)')
    }

    let response: Response
    try {
      response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.groqApiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.5,
          max_completion_tokens: 700,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            { role: 'user', content: buildUserPrompt(context) },
          ],
        }),
        signal: AbortSignal.timeout(env.aiServiceTimeoutMs),
      })
    } catch (err) {
      logger.error('Groq request failed', { err })
      throw ApiError.provider('Failed to reach the AI provider')
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      logger.error('Groq returned an error', { status: response.status, text })
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

    // Never trust raw AI JSON — validate it against the same schema controllers rely on.
    const result = aiStructuredResponseSchema.safeParse(parsedJson)
    if (!result.success) {
      logger.error('Groq response failed schema validation', { issues: result.error.issues })
      throw ApiError.provider('The AI provider returned an unexpected response shape')
    }
    return result.data
  }
}
