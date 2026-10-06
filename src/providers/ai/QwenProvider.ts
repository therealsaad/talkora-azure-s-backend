import { AIProvider, MissJulieContext } from './AIProvider'
import { AIStructuredResponse } from '../../types'
import { aiStructuredResponseSchema } from '../../schemas/ai.schema'
import { ApiError } from '../../utils/ApiError'
import { env } from '../../config/env'
import { logger } from '../../utils/logger'
import { GroqProvider } from './GroqProvider'
import { PythonAIProvider } from './PythonAIProvider'

function buildMissJulieSystemPrompt(): string {
  return [
    'You are Miss Julie, a warm, funny, energetic, encouraging, patient, and child-friendly AI English teacher for school students (Grades 4-10).',
    'Your goal is to help Indian school students speak English naturally, confidently, and happily.',
    'RULES:',
    '1. The current activity target/question in context is the source of truth. React to the student in that exact topic before moving to another concept.',
    '2. Never replace the live teacher question with an old pronunciation target, cached TTS line, generic trivia, or a different favourite topic.',
    '3. Use simple, warm, child-friendly English matching the student grade level.',
    '4. When the student makes a language or grammar mistake (e.g. "I goed to school"), praise their effort first, give a gentle correction, and model the correct sentence ("Almost right, Ayaan! We say \'I went to school\'. Can you try saying that?").',
    '5. Keep responses conversational and concise (1-3 sentences). Never lecture with complicated linguistic terms.',
    '6. When learning memories or past interests exist in context (e.g., likes cricket, favourite food is mango), reference them naturally to personalize the conversation.',
    '7. Always output ONLY a single valid JSON object matching this exact schema and nothing else:',
    '{',
    '  "message": string,',
    '  "emotion": "welcome" | "encouraging" | "delighted" | "thinking" | "celebrating" | "gentle_correction" | "modeling" | "retry",',
    '  "responseQuality": "STRONG" | "ADEQUATE" | "PARTIAL" | "UNCLEAR",',
    '  "evaluation": { "correct": boolean, "score": number, "feedback": string },',
    '  "corrections": string[],',
    '  "correction": { "needed": boolean, "original": string, "corrected": string, "explanation": string },',
    '  "hint": string | null,',
    '  "followUpQuestion": string | null,',
    '  "memoryUpdates": [ { "key": "favouriteFood" | "favouriteSport" | "favouriteSubject" | "favouriteAnimal" | "favouritePlace" | "favouriteFestival" | "hobby" | "learningStrength" | "learningNeed", "value": string, "category": "preference" | "vocabulary" | "grammar" | "pronunciation" | "speaking" | "behavior", "confidence": number } ],',
    '  "teachingAction": "CONTINUE_CONVERSATION" | "GENTLE_CORRECTION" | "MODEL_SENTENCE" | "WAIT_FOR_REPEAT" | "CELEBRATE_IMPROVEMENT" | "ASK_FOLLOW_UP" | "GIVE_HINT",',
    '  "modelSentence": string | null,',
    '  "shouldRetry": boolean,',
    '  "hintLevel": number,',
    '  "detectedSkills": string[],',
    '  "remainingSkills": string[]',
    '}',
    'Do NOT include markdown formatting, code fences (```json), or any text outside the JSON object.',
  ].join('\n')
}

function buildContextPayload(context: MissJulieContext): string {
  return JSON.stringify({
    student: {
      name: context.studentName,
      grade: context.grade,
      avatarType: context.avatarType || 'BOY',
    },
    curriculum: {
      unitNumber: context.unitNumber || 1,
      levelTitle: context.levelTitle,
      lessonTitle: context.lessonTitle,
      stage: context.stage,
      learningObjectives: context.learningObjectives,
      allowedVocabulary: context.allowedVocabulary,
    },
    activity: {
      title: context.activityTitle,
      currentQuestion: context.activityTarget,
      target: context.activityTarget,
      digitalType: context.digitalType,
      julieProfile: context.julieProfile,
      requiredConcepts: context.requiredConcepts,
      achievedConcepts: context.achievedConcepts,
      remainingConcepts: context.remainingConcepts,
    },
    memory: {
      knownFacts: context.memoryFacts,
      learningEvidence: context.learningEvidence,
      recentMistakes: context.recentMistakes,
    },
    conversationState: {
      recentHistory: context.conversationHistory,
      waitingForRetry: context.waitingForRetry,
      retryTargetSkill: context.retryTargetSkill,
      hintLevel: context.hintLevel,
      recentOpeners: context.recentJulieOpeners,
    },
    studentUtterance: context.studentMessage,
  })
}

export class QwenProvider implements AIProvider {
  name = 'qwen'
  private pythonFallback = new PythonAIProvider()
  private groqFallback = new GroqProvider()

  async generate(context: MissJulieContext): Promise<AIStructuredResponse> {
    const startedAt = Date.now()

    // If Qwen API key is configured, call Qwen direct endpoint
    if (env.qwenApiKey) {
      const url = `${env.qwenApiBase.replace(/\/$/, '')}/chat/completions`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), env.aiServiceTimeoutMs)

      try {
        if (env.nodeEnv !== 'production') {
          console.info('[TALKORA AI] QWEN_DIRECT_REQUEST', {
            student: context.studentName,
            message: context.studentMessage,
            model: env.qwenModel,
          })
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.qwenApiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: env.qwenModel,
            temperature: 0.7,
            messages: [
              { role: 'system', content: buildMissJulieSystemPrompt() },
              { role: 'user', content: buildContextPayload(context) },
            ],
            response_format: { type: 'json_object' },
          }),
        })

        if (!response.ok) {
          const detail = await response.text().catch(() => '')
          throw new Error(`Qwen API returned ${response.status}: ${detail.slice(0, 400)}`)
        }

        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>
        }
        const rawContent = data.choices?.[0]?.message?.content
        if (!rawContent) {
          throw new Error('Qwen API returned an empty response')
        }

        let cleaned = rawContent.trim()
        if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '')

        const parsedJson = JSON.parse(cleaned)
        const validated = aiStructuredResponseSchema.parse(parsedJson)

        if (env.nodeEnv !== 'production') {
          console.info('[TALKORA AI] QWEN_DIRECT_RESPONSE', {
            latencyMs: Date.now() - startedAt,
            message: validated.message,
          })
        }

        return validated
      } catch (err) {
        logger.warn('Direct Qwen call failed, attempting fallback...', {
          err: err instanceof Error ? err.message : err,
        })
      } finally {
        clearTimeout(timeout)
      }
    }

    // Try Python AI provider (local Qwen brain service)
    try {
      return await this.pythonFallback.generate(context)
    } catch (pythonErr) {
      logger.warn('Python AI provider unavailable, attempting Groq fallback...', {
        err: pythonErr instanceof Error ? pythonErr.message : pythonErr,
      })
    }

    // Try Groq fallback if configured
    if (env.groqApiKey) {
      try {
        return await this.groqFallback.generate(context)
      } catch (groqErr) {
        logger.error('Groq fallback failed', {
          err: groqErr instanceof Error ? groqErr.message : groqErr,
        })
      }
    }

    // Safe friendly teacher fallback so student experience is never destroyed
    logger.warn('All AI providers unavailable, generating safe teacher response.')
    const studentFirst = context.studentName || 'there'
    return {
      message: `I heard you, ${studentFirst}! You are doing very well. Let us try speaking another sentence together!`,
      emotion: 'encouraging',
      responseQuality: 'ADEQUATE',
      corrections: [],
      hint: null,
      followUpQuestion: 'Would you like to tell me more?',
      memoryUpdates: [],
      xpAwarded: 0,
      teachingAction: 'CONTINUE_CONVERSATION',
      modelSentence: null,
      shouldRetry: false,
      hintLevel: 0,
      detectedSkills: [],
      remainingSkills: [],
    }
  }
}
