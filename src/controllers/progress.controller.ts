import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { ProgressService } from '../services/progress.service'
import { ApiError } from '../utils/ApiError'
import { Activity } from '../models/Activity'
import { canCompleteLocalActivity } from '../services/localActivity'
import { HomePractice } from '../models/HomePractice'
import type { VoiceUploadRequest } from '../middleware/voice-upload'

export const ProgressController = {
  getHomePractice: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    const submission = await HomePractice.findOne({ studentId: req.auth.id, unitKey: 'UNIT1_FAVOURITES' }).select('reflection submittedAt audioSizeBytes').lean()
    ok(res, submission ? { reflection: submission.reflection, submittedAt: submission.submittedAt, hasAudio: Boolean(submission.audioSizeBytes) } : null)
  }),
  getHomePracticeAudio: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    const submission = await HomePractice.findOne({ studentId: req.auth.id, unitKey: 'UNIT1_FAVOURITES' }).select('audioData audioContentType')
    if (!submission?.audioData) throw ApiError.notFound('Home practice recording not found')
    res.setHeader('Content-Type', submission.audioContentType || 'application/octet-stream')
    res.setHeader('Content-Length', submission.audioData.length)
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.send(submission.audioData)
  }),
  saveHomePractice: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    const upload = req as VoiceUploadRequest
    const file = upload.voiceFile
    let audioContentType: string | undefined
    if (file) {
      if (!file.size) throw ApiError.badRequest('Audio file is empty')
      audioContentType = file.mimetype.split(';', 1)[0].trim().toLowerCase()
      if (!/^audio\/(webm|ogg|wav|x-wav|mp4|mpeg|x-m4a|aac)$/i.test(audioContentType)) {
        throw ApiError.badRequest('Unsupported audio type')
      }
    }
    const filter = { studentId: req.auth.id, unitKey: 'UNIT1_FAVOURITES' as const }
    if (!file) {
      const existing = await HomePractice.findOne(filter).select('audioSizeBytes').lean()
      if (!existing?.audioSizeBytes) throw ApiError.badRequest('An audio recording is required')
    }
    const fields = {
      reflection: req.body.reflection,
      submittedAt: new Date(),
      ...(file ? { audioData: file.buffer, audioContentType, audioSizeBytes: file.size } : {}),
    }
    const submission = await HomePractice.findOneAndUpdate(
      filter,
      { $set: fields },
      { upsert: true, new: true, runValidators: true },
    ).lean()
    ok(res, { reflection: submission!.reflection, submittedAt: submission!.submittedAt, hasAudio: Boolean(submission!.audioSizeBytes) })
  }),
  completeLocalActivity: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    const activity = await Activity.findById(req.params.activityId).select('type stage content')
    if (!activity) throw ApiError.notFound('Activity not found')
    const itemCount = activity.type === 'LIKE_DISLIKE'
      ? (Array.isArray(activity.content?.visualPrompts) && activity.content.visualPrompts.length ? activity.content.visualPrompts.length : 6)
      : (Array.isArray(activity.content?.dialogueTurns) ? activity.content.dialogueTurns.length : 0)
    if ((activity.type === 'PICTURE_CHOICE' && activity.stage !== 'REWARD') ||
        !canCompleteLocalActivity(activity.type, req.body.answer, itemCount, Array.isArray(activity.content?.skills) ? activity.content.skills.filter((skill): skill is string => typeof skill === 'string') : [])) {
      throw ApiError.badRequest('This activity has not been completed')
    }
    const result = await ProgressService.submitAttempt({
      studentId: req.auth.id,
      activityId: req.params.activityId,
      answer: req.body.answer,
      startedAt: new Date(),
      hintsUsed: 0,
      idempotencyKey: `local:${req.auth.id}:${req.params.activityId}`,
      evaluation: { score: 100, feedback: 'Activity completed.' },
    })
    ok(res, result)
  }),
  submitAttempt: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden('Only students submit attempts')
    const { answer, startedAt, hintsUsed, idempotencyKey } = req.body
    const result = await ProgressService.submitAttempt({
      studentId: req.auth.id, // identity derived from the token, never from the request body
      activityId: req.params.activityId,
      answer,
      startedAt: new Date(startedAt),
      hintsUsed,
      idempotencyKey,
    })
    ok(res, result)
  }),

  getForClass: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    const progress = await ProgressService.getForStudent(req.auth.id, req.params.classId)
    ok(res, progress)
  }),
}
