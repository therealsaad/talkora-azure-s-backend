import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { MissJulieService } from '../services/missJulie.service'
import { RecommendationService } from '../services/recommendation.service'
import { LearningEvent } from '../models/LearningEvent'
import { ApiError } from '../utils/ApiError'

export const AIController = {
  startConversation: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden('Only students can talk with Miss Julie')
    const result = await MissJulieService.startConversation(req.auth.id, req.body)
    await LearningEvent.create({
      studentId: req.auth.id,
      type: 'voice_session_started',
      metadata: { conversationId: result.conversationId, mode: req.body?.mode },
    })
    ok(res, result, 201)
  }),

  converse: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden('Only students can talk with Miss Julie')
    const { message, conversationId, lessonId, activityId, context, inputMode, currentTarget } = req.body
    const response = await MissJulieService.converse(req.auth.id, {
      message,
      conversationId,
      lessonId,
      activityId,
      context,
      inputMode,
      currentTarget,
    })
    ok(res, response)
  }),

  endConversation: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden('Only students can end conversations')
    const result = await MissJulieService.endConversation(req.auth.id, req.params.conversationId)
    await LearningEvent.create({
      studentId: req.auth.id,
      type: 'voice_session_completed',
      metadata: { conversationId: result.conversationId },
    })
    ok(res, result)
  }),

  missJulie: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden('Only students can talk with Miss Julie')
    const { message, conversationId, lessonId, activityId, context, inputMode } = req.body
    const response = await MissJulieService.converse(req.auth.id, {
      message,
      conversationId,
      lessonId,
      activityId,
      context,
      inputMode,
    })
    ok(res, response)
  }),

  recommendation: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    ok(res, { recommendations: await RecommendationService.recommendForStudent(req.auth.id) })
  }),
}
