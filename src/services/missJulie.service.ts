import { Types } from 'mongoose'
import { Activity } from '../models/Activity'
import { Conversation, IConversation } from '../models/Conversation'
import { MissJulieContext } from '../providers/ai/AIProvider'
import { getAIProvider } from '../providers/ai'
import { GeminiConversationProvider } from '../providers/ai/GeminiConversationProvider'
import { ApiError } from '../utils/ApiError'
import { ProgressService } from './progress.service'
import { detectStudentSkills, masteryFor, mergeEvidence, nextRetryState } from './pedagogy.service'
import { MemoryService } from './memory.service'
import { MistakeService } from './mistake.service'
import { StudentContextService } from './student-context.service'
import { finalizeConversationTeacherResponse } from './conversationTurns'
import { env } from '../config/env'

function detectedConcepts(message: string): string[] {
  const text = message.toLowerCase()
  const concepts: string[] = []
  if (/\b(favou?rite|like .+ (best|most))\b/.test(text)) concepts.push('state_favourite')
  if (/\b(with|at|on|after|before|during)\b/.test(text)) concepts.push('answer_follow_up')
  if (/\b(because|since|so that)\b/.test(text)) concepts.push('give_reason')
  if (/\b(same|different|both|that'?s okay)\b/.test(text)) concepts.push('respect_difference')
  if (/\b(would like|please|order)\b/.test(text)) concepts.push('place_order')
  if (/\b(water|juice|tea|drink)\b/.test(text)) concepts.push('order_drink')
  if (/\b(thank you|thanks|goodbye)\b/.test(text)) concepts.push('close_politely')
  if (/\bmy name is\b/.test(text)) concepts.push('name')
  if (/\bfavou?rite food\b/.test(text)) concepts.push('favourite_food')
  if (/\bfavou?rite sport\b|\b(cricket|football|badminton|basketball)\b/.test(text)) concepts.push('favourite_sport')
  if (/\bfavou?rite subject\b|\b(english|maths?|science|evs|p\.?e\.?)\b/.test(text)) concepts.push('favourite_subject')
  if (/\bwith (my )?(friend|friends|cousin|cousins|brother|sister|family)\b/.test(text)) concepts.push('sport_company')
  if (/\bbecause\b/.test(text)) concepts.push('sport_reason')
  if (/\bfavou?rite place\b/.test(text)) concepts.push('favourite_place')
  if (/\b(play|read|walk|visit|go|eat|study)\b.*\b(there|park|library|market|school|home)\b/.test(text)) concepts.push('place_activity')
  if (/\bfavou?rite animal\b|\b(tiger|lion|dog|cat|elephant|rabbit)\b/.test(text)) concepts.push('favourite_animal')
  if (/\b(they|it) (are|is)\b|\bbecause\b/.test(text)) concepts.push('animal_reason')
  if (/\bfavou?rite festival\b|\b(eid|diwali|christmas|holi|onam)\b/.test(text)) concepts.push('favourite_festival')
  if (/\bcelebrate\b|\b(special food|with my family|decorate|visit|pray)\b/.test(text)) concepts.push('festival_celebration')
  if (/\b(english|maths?|science|evs|p\.?e\.?)\b.*\bbecause\b|\b(stories|storybooks|sums|problems|experiments|writing|exercise|games)\b/.test(text)) concepts.push('subject_reason')
  if (/\bfavou?rite (place|animal|festival)\b/.test(text)) concepts.push('extended_favourite')
  if (/\b(i like|i don'?t like|it'?s not for me)\b/.test(text)) concepts.push('state_preference')
  return concepts
}

export const MissJulieService = {
  /**
   * Builds compact tutor context using StudentContextService.
   */
  async buildContext(
    studentId: string,
    input: {
      message?: string
      lessonId?: string
      activityId?: string
      promptContext?: string
      currentTarget?: string
    },
  ): Promise<MissJulieContext & { classId?: string }> {
    return StudentContextService.buildContext(studentId, {
      message: input.message,
      lessonId: input.lessonId,
      activityId: input.activityId,
      promptContext: input.promptContext || 'conversation',
      currentTarget: input.currentTarget,
    })
  },

  /**
   * Start or resume a conversation session with Miss Julie.
   * Generates a personalized greeting based on real MongoDB student data.
   */
  async startConversation(
    studentId: string,
    input: {
      lessonId?: string
      activityId?: string
      mode?: 'FREE_TALK' | 'LESSON' | 'PRACTICE'
    } = {},
  ) {
    const context = await StudentContextService.buildContext(studentId, {
      lessonId: input.lessonId,
      activityId: input.activityId,
      promptContext: 'greeting',
    })

    // Check for existing active conversation
    let conversation: IConversation | null = null
    if (input.activityId) {
      conversation = await Conversation.findOne({
        studentId: new Types.ObjectId(studentId),
        activityId: new Types.ObjectId(input.activityId),
        status: 'ACTIVE',
      })
    } else if (input.lessonId) {
      conversation = await Conversation.findOne({
        studentId: new Types.ObjectId(studentId),
        lessonId: new Types.ObjectId(input.lessonId),
        status: 'ACTIVE',
      }).sort('-updatedAt')
    } else {
      conversation = await Conversation.findOne({
        studentId: new Types.ObjectId(studentId),
        mode: input.mode || 'FREE_TALK',
        status: 'ACTIVE',
      }).sort('-updatedAt')
    }

    // If active conversation already has messages, return current state
    if (conversation && conversation.messages.length > 0) {
      const lastMsg = conversation.messages[conversation.messages.length - 1]
      return {
        conversationId: conversation._id.toString(),
        message: lastMsg.role === 'missJulie' ? lastMsg.content : `Welcome back, ${context.studentName}! Ready to continue?`,
        emotion: lastMsg.emotion || 'welcome',
        followUpQuestion: null,
        suggestedResponses: ['I am ready!', 'Hello Miss Julie!', 'Tell me what to do'],
        conversation: {
          id: conversation._id.toString(),
          status: conversation.status,
          turnCount: conversation.turnCount,
          messagesCount: conversation.messages.length,
        },
      }
    }

    // Generate intelligent personalized opening greeting using Qwen
    let greetingText: string
    let greetingEmotion: string = 'welcome'

    if (context.isFirstSession) {
      greetingText = `Hi ${context.studentName}! I'm Miss Julie. I am so excited to learn English with you today! What is your favourite thing to do?`
    } else if (context.memoryFacts && context.memoryFacts.length > 0) {
      const firstFact = context.memoryFacts[0]
      if (firstFact.includes('favouriteSport') || firstFact.toLowerCase().includes('cricket')) {
        greetingText = `Welcome back, ${context.studentName}! Ready to practice English and talk about sports today?`
      } else if (context.recentMistakes && context.recentMistakes.length > 0) {
        greetingText = `Welcome back, ${context.studentName}! It is wonderful to see you again. Shall we do a quick speaking warmup together?`
      } else {
        greetingText = `Welcome back, ${context.studentName}! You're doing great on your Talkora adventure. What would you like to talk about today?`
      }
    } else {
      greetingText = `Hi ${context.studentName}! Welcome back to Talkora. I'm right here with you. How are you feeling today?`
    }

    // Create the conversation document
    conversation = await Conversation.create({
      studentId: new Types.ObjectId(studentId),
      lessonId: input.lessonId ? new Types.ObjectId(input.lessonId) : undefined,
      activityId: input.activityId ? new Types.ObjectId(input.activityId) : undefined,
      mode: input.mode || (input.activityId || input.lessonId ? 'LESSON' : 'FREE_TALK'),
      status: 'ACTIVE',
      turnCount: 0,
      messages: [
        {
          role: 'missJulie',
          content: greetingText,
          emotion: greetingEmotion,
          createdAt: new Date(),
        },
      ],
    })

    return {
      conversationId: conversation._id.toString(),
      message: greetingText,
      emotion: greetingEmotion,
      followUpQuestion: null,
      suggestedResponses: ['I am doing great!', 'I want to practice English', 'Tell me a story'],
      conversation: {
        id: conversation._id.toString(),
        status: conversation.status,
        turnCount: conversation.turnCount,
        messagesCount: conversation.messages.length,
      },
    }
  },

  /**
   * Main conversation turn:
   * Authenticated Student + Transcript -> Qwen AI -> Structured Result -> Memory & Mistakes -> Response
   */
  async converse(
    studentId: string,
    input: {
      message: string
      conversationId?: string
      lessonId?: string
      activityId?: string
      context?: string
      inputMode?: 'OPTION' | 'MIC' | 'TEXT'
      currentTarget?: string
    },
  ) {
    const studentContext = await StudentContextService.buildContext(studentId, {
      message: input.message,
      lessonId: input.lessonId,
      activityId: input.activityId,
      promptContext: input.context || 'conversation',
      currentTarget: input.currentTarget,
    })

    const activity = input.activityId ? await Activity.findById(input.activityId).lean() : null

    // Load active conversation
    let existingConversation: IConversation | null = null
    if (input.conversationId) {
      existingConversation = await Conversation.findOne({
        _id: new Types.ObjectId(input.conversationId),
        studentId: new Types.ObjectId(studentId),
      })
    } else if (input.activityId) {
      existingConversation = await Conversation.findOne({
        studentId: new Types.ObjectId(studentId),
        activityId: new Types.ObjectId(input.activityId),
        status: 'ACTIVE',
      })
    } else if (input.lessonId) {
      existingConversation = await Conversation.findOne({
        studentId: new Types.ObjectId(studentId),
        lessonId: new Types.ObjectId(input.lessonId),
        status: 'ACTIVE',
      }).sort('-updatedAt')
    } else {
      existingConversation = await Conversation.findOne({
        studentId: new Types.ObjectId(studentId),
        status: 'ACTIVE',
      }).sort('-updatedAt')
    }

    if (existingConversation && existingConversation.status !== 'ACTIVE') {
      throw ApiError.conflict('Conversation is complete. Start a new practice session.')
    }

    if (
      input.activityId &&
      !existingConversation &&
      (await Conversation.exists({
        studentId: new Types.ObjectId(studentId),
        activityId: new Types.ObjectId(input.activityId),
        status: 'COMPLETED',
      }))
    ) {
      throw ApiError.activityCompleted()
    }

    const priorGoals = existingConversation?.goalState || []
    const isGoldEpisode = Array.isArray(activity?.metadata?.masteryEvidence)
    const turnSkills = isGoldEpisode
      ? detectStudentSkills(input.message)
      : detectedConcepts(input.message)
    const goalState = [...new Set([...priorGoals, ...turnSkills])]
    const nextTurn = (existingConversation?.turnCount || 0) + 1

    // Mastery is checked before deciding whether to keep the child in the same
    // conversation. This prevents the old "always five turns" loop.
    const goal = activity?.conversationGoal
    const required = goal?.requiredConcepts || []
    const priorRetry = existingConversation?.retryState?.waiting
      ? existingConversation.retryState
      : undefined

    const skillEvidence = isGoldEpisode
      ? mergeEvidence(
          existingConversation?.skillEvidence || [],
          turnSkills,
          input.message,
          nextTurn,
          priorRetry,
          input.inputMode || 'TEXT',
        )
      : existingConversation?.skillEvidence || []

    const lessonConversation = Boolean(
      activity?.metadata?.conversationMode === 'OPEN' &&
      input.lessonId &&
      input.activityId,
    )
    const minTurns = Math.max(1, goal?.minTurns || 2)
    const maxTurns = Math.max(minTurns, goal?.maxTurns || activity?.maxConversationTurns || 5)
    const demonstratedRequiredSkills = required.length === 0
      ? nextTurn >= minTurns
      : isGoldEpisode
        ? required.every((skill) => skillEvidence.some((item) => item.skill === skill))
        : required.every((item) => goalState.includes(item))
    const finalLessonTurn = Boolean(
      lessonConversation &&
      ((nextTurn >= minTurns && demonstratedRequiredSkills) || nextTurn >= maxTurns),
    )

    const freeTalkConversation = !input.lessonId && !input.activityId && (!existingConversation || existingConversation.mode === 'FREE_TALK')
    const finalFreeTalkTurn = freeTalkConversation && nextTurn >= 5
    const finalTurn = finalLessonTurn || finalFreeTalkTurn

    // Free-talk practice uses Talkora's already-configured Gemini API. Lesson
    // conversations continue using the provider selected for the lesson path.
    const provider = freeTalkConversation && env.nodeEnv !== 'test'
      ? new GeminiConversationProvider()
      : getAIProvider()
    let response = await provider.generate(studentContext)
    response = finalizeConversationTeacherResponse(response, finalTurn)
    if (lessonConversation || freeTalkConversation) response.activityComplete = finalTurn
    const teacherContent = [response.message, response.followUpQuestion].filter(Boolean).join(' ')

    // Educational logic & Mastery determination
    const bounded = finalTurn || (!lessonConversation && nextTurn >= maxTurns)

    const calculatedMasteryStatus = isGoldEpisode
      ? masteryFor(required, skillEvidence, bounded)
      : required.length > 0 && required.every((item) => goalState.includes(item)) && nextTurn >= (goal?.minTurns || 1)
        ? 'MASTERED'
        : bounded && required.length > 0
          ? 'NEEDS_PRACTICE'
          : 'IN_PROGRESS'
    const masteryStatus = finalFreeTalkTurn
      ? 'COMPLETED_WITH_SUPPORT'
      : lessonConversation
      ? finalLessonTurn
        ? calculatedMasteryStatus === 'MASTERED' ? 'MASTERED' : 'COMPLETED_WITH_SUPPORT'
        : 'IN_PROGRESS'
      : calculatedMasteryStatus

    const completed = masteryStatus === 'MASTERED' || masteryStatus === 'COMPLETED_WITH_SUPPORT'
    const requiresRemediation = masteryStatus === 'NEEDS_PRACTICE'
    const waitingActions = [
      'GENTLE_CORRECTION',
      'MODEL_SENTENCE',
      'MODEL_FULL_SENTENCE',
      'WAIT_FOR_REPEAT',
      'GIVE_HINT',
      'RETRY',
    ]
    const shouldRetry = !finalTurn && Boolean(
      response.shouldRetry ||
        waitingActions.includes(response.teachingAction || '') ||
        requiresRemediation,
    )

    const retryState = nextRetryState({
      previous: priorRetry,
      shouldRetry,
      hintLevel: response.hintLevel,
      targetSkill:
        response.remainingSkills?.[0] ||
        studentContext.remainingConcepts?.[0] ||
        required.find((skill) => !skillEvidence.some((item) => item.skill === skill)),
      originalUtterance: input.message,
      modelSentence: response.modelSentence,
    })

    const freeTalkSummary = finalFreeTalkTurn
      ? `Student conversed for ${nextTurn} turns. Key topics discussed: ${[
          ...(existingConversation?.messages.filter((message) => message.role === 'student').map((message) => message.content) || []),
          input.message,
        ].slice(-4).join('; ').slice(0, 300)}`
      : undefined

    // Persist conversation update
    const conversation = await Conversation.findOneAndUpdate(
      existingConversation
        ? { _id: existingConversation._id }
        : {
            studentId: new Types.ObjectId(studentId),
            lessonId: input.lessonId ? new Types.ObjectId(input.lessonId) : undefined,
            activityId: input.activityId ? new Types.ObjectId(input.activityId) : undefined,
            status: 'ACTIVE',
          },
      {
        $push: {
          messages: {
            $each: [
              {
                role: 'student',
                content: input.message,
                inputMode: input.inputMode || 'TEXT',
                createdAt: new Date(),
              },
              {
                role: 'missJulie',
                content: teacherContent,
                emotion: response.emotion,
                createdAt: new Date(),
              },
            ],
            $slice: -40,
          },
        },
        $set: {
          turnCount: nextTurn,
          goalState,
          skillEvidence,
          retryState: retryState || {
            waiting: false,
            targetSkill: '',
            attempt: 0,
            hintLevel: 0,
            originalUtterance: '',
          },
          masteryStatus,
          status: completed ? 'COMPLETED' : 'ACTIVE',
          ...(completed ? { completedAt: new Date() } : {}),
          ...(freeTalkSummary ? { summary: freeTalkSummary } : {}),
        },
      },
      { upsert: true, new: true },
    )

    // Complete lesson activity attempt if applicable
    if (completed && activity && input.activityId && input.lessonId) {
      const score = masteryStatus === 'MASTERED' ? 90 : masteryStatus === 'COMPLETED_WITH_SUPPORT' ? 75 : 55
      await ProgressService.submitAttempt({
        studentId,
        activityId: input.activityId,
        answer: input.message,
        startedAt: conversation.createdAt,
        hintsUsed: Math.max(0, priorRetry?.hintLevel || 0),
        idempotencyKey: `conversation:${conversation._id}`,
        evaluation: { score, feedback: 'Conversation goals demonstrated.' },
      })
    }

    // Persist personal and learning memories
    await MemoryService.persistVerifiedPersonalFacts({
      studentId,
      transcript: input.message,
      inputMode: input.inputMode || 'TEXT',
      activityId: input.activityId,
      conversationId: conversation._id.toString(),
      turn: nextTurn,
    })

    if (skillEvidence.length > 0) {
      await MemoryService.persistLearningEvidence({
        studentId,
        activityId: input.activityId,
        conversationId: conversation._id.toString(),
        evidence: skillEvidence,
      })
    }

    // Apply Qwen-suggested memories if valid
    if (response.memoryUpdates && response.memoryUpdates.length > 0) {
      await MemoryService.applyMemorySuggestions({
        studentId,
        suggestions: response.memoryUpdates,
        conversationId: conversation._id.toString(),
        activityId: input.activityId,
        turn: nextTurn,
        transcript: input.message,
      })
    }

    // Record mistakes if Qwen detected language mistakes
    if (response.correction?.needed && response.correction.original) {
      await MistakeService.recordMistake(studentId, {
        skill: response.correction.explanation || response.teachingAction || 'grammar',
        expected: response.correction.corrected || '',
        actual: response.correction.original || input.message,
        activityId: input.activityId,
        lessonId: input.lessonId,
        type: 'conversation',
      })
    } else if (response.corrections && response.corrections.length > 0) {
      await MistakeService.recordMistake(studentId, {
        skill: 'grammar_or_pronunciation',
        expected: response.corrections[0] || '',
        actual: input.message,
        activityId: input.activityId,
        lessonId: input.lessonId,
        type: 'conversation',
      })
    } else if (priorRetry && !shouldRetry) {
      // If student previously had a mistake retry and now answered correctly, resolve the mistake!
      if (priorRetry.targetSkill) {
        await MistakeService.resolveMistake(studentId, priorRetry.targetSkill)
      }
    }

    return {
      ...response,
      message: response.message,
      emotion: response.emotion,
      shouldRetry,
      hintLevel: retryState?.hintLevel || 0,
      followUpQuestion: response.followUpQuestion,
      conversation: {
        id: conversation._id.toString(),
        status: conversation.status,
        turnCount: conversation.turnCount,
        achievedConcepts: conversation.goalState,
        requiredConcepts: required,
        skillEvidence: conversation.skillEvidence,
        retryState: conversation.retryState,
        masteryStatus: conversation.masteryStatus,
        complete: conversation.status === 'COMPLETED',
      },
    }
  },

  /**
   * End a conversation session and generate a concise summary for future session continuity.
   */
  async endConversation(studentId: string, conversationId: string) {
    const conversation = await Conversation.findOne({
      _id: new Types.ObjectId(conversationId),
      studentId: new Types.ObjectId(studentId),
    })

    if (!conversation) throw ApiError.notFound('Conversation not found')

    if (conversation.status !== 'COMPLETED') {
      conversation.status = 'COMPLETED'
      conversation.completedAt = new Date()
    }

    // If summary doesn't exist yet and there are messages, create a compact summary
    if (!conversation.summary && conversation.messages.length > 1) {
      const studentMessages = conversation.messages
        .filter((m) => m.role === 'student')
        .map((m) => m.content)
      const topics = studentMessages.slice(-4).join('; ')
      conversation.summary = `Student conversed for ${conversation.turnCount} turns. Key topics discussed: ${topics.slice(0, 300)}.`
    }

    await conversation.save()

    return {
      conversationId: conversation._id.toString(),
      status: conversation.status,
      summary: conversation.summary,
      completedAt: conversation.completedAt,
    }
  },
}
