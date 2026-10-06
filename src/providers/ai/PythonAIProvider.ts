import { env } from '../../config/env'
import { aiStructuredResponseSchema } from '../../schemas/ai.schema'
import { AIStructuredResponse } from '../../types'
import { AIProvider, MissJulieContext, unitTeachingGuidance } from './AIProvider'
import { GroqProvider } from './GroqProvider'
import { ApiError } from '../../utils/ApiError'

export class PythonAIProvider implements AIProvider {
  name = 'python-qwen'
  private fallbackGroq = new GroqProvider()

  async generate(context: MissJulieContext): Promise<AIStructuredResponse> {
    const startedAt = Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), env.aiServiceTimeoutMs)
    const unitGuidance = unitTeachingGuidance(context)

    try {
      if (env.nodeEnv !== 'production') {
        console.info('[TALKORA AI] QWEN_REQUEST', {
          student: context.studentName,
          unit: context.unitNumber,
          activity: context.activityTitle,
          message: context.studentMessage,
        })
      }

      const response = await fetch(
        `${env.aiServiceUrl.replace(/\/$/, '')}/v1/brain/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            studentName: context.studentName,
            grade: context.grade,
            avatarType: context.avatarType || 'BOY',
            unitNumber: context.unitNumber || 1,
            unitTitle: context.levelTitle || 'My Favourite Things',
            lessonTitle: context.lessonTitle,
            stage: context.stage || context.promptContext,
            activityTitle: context.activityTitle || '',
            digitalType: context.digitalType || '',
            julieProfile: context.julieProfile || {},
            currentQuestion: context.activityTarget || context.activityTitle || '',
            allowedVocabulary: context.allowedVocabulary || [],
            learningObjectives: unitGuidance
              ? [...(context.learningObjectives || []), unitGuidance]
              : context.learningObjectives || [],
            recentMistakes: context.recentMistakes,
            studentMemory: context.memoryFacts,
            learningEvidence: context.learningEvidence || [],
            conversationHistory: context.conversationHistory || [],
            requiredConcepts: context.requiredConcepts || [],
            achievedConcepts: context.achievedConcepts || [],
            remainingConcepts: context.remainingConcepts || [],
            hintLevel: context.hintLevel || 0,
            waitingForRetry: Boolean(context.waitingForRetry),
            retryTargetSkill: context.retryTargetSkill || '',
            recentJulieOpeners: context.recentJulieOpeners || [],
            preferredExplanationLanguage: 'English',
            studentMessage: context.studentMessage,
          }),
        },
      )

      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        throw new Error(
          `Python AI service returned ${response.status}: ${detail.slice(0, 400)}`,
        )
      }

      const brain = (await response.json()) as {
        message: string
        reaction: string
        responseQuality?: string
        followUpQuestion?: string | null
        correction?: {
          needed?: boolean
          original?: string
          corrected?: string
          explanation?: string
        }
        memoryUpdates?: Array<{
          key: string
          value: string
          category: string
          confidence: number
        }>
        recommendedAction?: string
        teachingAction?: string
        modelSentence?: string | null
        activityComplete?: boolean
        shouldRetry?: boolean
        hintLevel?: number
        detectedSkills?: string[]
        remainingSkills?: string[]
      }

      const result = aiStructuredResponseSchema.parse({
        message: brain.message,
        emotion: brain.reaction,
        responseQuality: brain.responseQuality || 'ADEQUATE',
        corrections:
          brain.correction?.needed && brain.correction.corrected
            ? [brain.correction.corrected]
            : [],
        correction: brain.correction
          ? {
              needed: Boolean(brain.correction.needed),
              original: brain.correction.original || '',
              corrected: brain.correction.corrected || '',
              explanation: brain.correction.explanation || '',
            }
          : undefined,
        hint: brain.correction?.needed
          ? brain.correction.explanation || null
          : null,
        followUpQuestion: brain.followUpQuestion || null,
        memoryUpdates: brain.memoryUpdates || [],
        xpAwarded: 0,
        recommendation: brain.recommendedAction || null,
        teachingAction:
          brain.teachingAction || brain.recommendedAction || null,
        modelSentence: brain.modelSentence || null,
        activityComplete: Boolean(brain.activityComplete),
        shouldRetry: Boolean(brain.shouldRetry),
        hintLevel: brain.hintLevel || 0,
        detectedSkills: brain.detectedSkills || [],
        remainingSkills: brain.remainingSkills || [],
      })

      if (env.nodeEnv !== 'production') {
        console.info('[TALKORA AI] QWEN_RESPONSE', {
          latencyMs: Date.now() - startedAt,
          message: result.message,
          followUpQuestion: result.followUpQuestion,
        })
      }

      return result
    } catch (error) {
      console.warn(
        '[TALKORA AI] Local Qwen unavailable.',
        error instanceof Error ? error.message : error,
      )

      // A configured real cloud provider is an acceptable explicit fallback.
      // Never silently replace a failed Qwen turn with MockAIProvider because
      // that makes a broken local AI stack look healthy.
      if (env.groqApiKey) {
        try {
          return await this.fallbackGroq.generate(context)
        } catch (groqError) {
          console.warn(
            '[TALKORA AI] Groq fallback failed.',
            groqError instanceof Error ? groqError.message : groqError,
          )
        }
      }

      throw ApiError.provider('AI_SERVICE_UNAVAILABLE')
    } finally {
      clearTimeout(timeout)
    }
  }
}
