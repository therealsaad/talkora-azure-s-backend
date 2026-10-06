// import { Request, Response } from 'express'
// import { catchAsync } from '../utils/catchAsync'
// import { ok } from '../utils/ApiResponse'
// import { VoiceService } from '../services/voice.service'
// import { LearningEvent } from '../models/LearningEvent'
// import { ApiError } from '../utils/ApiError'
// import type { VoiceUploadRequest } from '../middleware/voice-upload'

// export const VoiceController = {
//   start: catchAsync(async (req: Request, res: Response) => {
//     if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
//     const session = await VoiceService.startSession(req.auth.id, req.body)
//     await LearningEvent.create({ studentId: req.auth.id, type: 'voice_session_started', lessonId: req.body.lessonId, activityId: req.body.activityId })
//     ok(res, session, 201)
//   }),

//   submitTranscript: catchAsync(async (req: Request, res: Response) => {
//     if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
//     const session = await VoiceService.submitTranscript(req.auth.id, req.params.sessionId, req.body)
//     await LearningEvent.create({ studentId: req.auth.id, type: 'voice_session_completed', metadata: { sessionId: session._id } })
//     ok(res, session)
//   }),

//   cancel: catchAsync(async (req: Request, res: Response) => {
//     if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
//     ok(res, await VoiceService.cancelSession(req.auth.id, req.params.sessionId))
//   }),

//   synthesize: catchAsync(async (req: Request, res: Response) => {
//     if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
//     const { text } = req.body
//     const stream = await VoiceService.streamSynthesize(text)
//     if (stream) {
//       res.status(200)
//       res.setHeader('Content-Type', stream.contentType)
//       res.setHeader('Cache-Control', 'no-store')
//       res.setHeader('X-Voice-Provider', stream.provider)
//       for (const [header, value] of Object.entries(stream.metadata || {})) res.setHeader(header, value)
//       const reader = stream.body.getReader()
//       req.on('close', () => { void reader.cancel() })
//       while (true) {
//         const next = await reader.read()
//         if (next.done) break
//         res.write(Buffer.from(next.value))
//       }
//       reader.releaseLock()
//       res.end()
//       return
//     }
//     ok(res, await VoiceService.synthesize(text))
//   }),

//   transcribe: catchAsync(async (req: Request, res: Response) => {
//     if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
//     const upload = req as VoiceUploadRequest
//     if (upload.voiceFile) {
//       const file = upload.voiceFile
//       if (!file.size) throw ApiError.badRequest('Audio file is empty')
//       if (!/^audio\/(webm|ogg|wav|mp4|mpeg)(;.*)?$/i.test(file.mimetype)) throw ApiError.badRequest('Unsupported audio type')
//       const durationMs = Number(upload.voiceFields?.durationMs)
//       if (Number.isFinite(durationMs) && (durationMs < 250 || durationMs > 10_000)) throw ApiError.badRequest('Audio duration must be between 250ms and 10 seconds')
//       ok(res, await VoiceService.transcribeAudio({
//         audioBase64: file.buffer.toString('base64'),
//         mimeType: file.mimetype,
//         durationMs: Number.isFinite(durationMs) ? durationMs : undefined,
//       }))
//       return
//     }
//     if (!req.body?.audioBase64) throw ApiError.badRequest('Audio file is required')
//     ok(res, await VoiceService.transcribeAudio(req.body))
//   }),
// }


import { Request, Response } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { ok } from '../utils/ApiResponse'
import { VoiceService } from '../services/voice.service'
import { LearningEvent } from '../models/LearningEvent'
import { ApiError } from '../utils/ApiError'
import { VoiceWarmupService } from '../services/voice-warmup.service'
import type { VoiceUploadRequest } from '../middleware/voice-upload'

export const VoiceController = {
  start: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    const session = await VoiceService.startSession(req.auth.id, req.body)
    await LearningEvent.create({ studentId: req.auth.id, type: 'voice_session_started', lessonId: req.body.lessonId, activityId: req.body.activityId })
    ok(res, session, 201)
  }),

  submitTranscript: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    const session = await VoiceService.submitTranscript(req.auth.id, req.params.sessionId, req.body)
    await LearningEvent.create({ studentId: req.auth.id, type: 'voice_session_completed', metadata: { sessionId: session._id } })
    ok(res, session)
  }),

  cancel: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    ok(res, await VoiceService.cancelSession(req.auth.id, req.params.sessionId))
  }),

  synthesize: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    const { text, purpose, language } = req.body
    const stream = await VoiceService.streamSynthesize(text, { studentId: req.auth.id, purpose, language })
    if (stream) {
      res.status(200)
      res.setHeader('Content-Type', stream.contentType)
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('X-Voice-Provider', stream.provider)
      for (const [header, value] of Object.entries(stream.metadata || {})) res.setHeader(header, value)
      const reader = stream.body.getReader()
      req.on('close', () => { void reader.cancel() })
      while (true) {
        const next = await reader.read()
        if (next.done) break
        res.write(Buffer.from(next.value))
      }
      reader.releaseLock()
      res.end()
      return
    }
    ok(res, await VoiceService.synthesize(text, { purpose }))
  }),

  transcribe: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()

    const upload = req as VoiceUploadRequest
    if (upload.voiceFile) {
      const file = upload.voiceFile
      if (!file.size) throw ApiError.badRequest('Audio file is empty')
      if (!/^audio\/(webm|ogg|wav|mp4|mpeg|x-m4a)(;.*)?$/i.test(file.mimetype)) {
        throw ApiError.badRequest('Unsupported audio type')
      }
      const durationMs = Number(upload.voiceFields?.durationMs)
      if (Number.isFinite(durationMs) && (durationMs < 250 || durationMs > 10_000)) {
        throw ApiError.badRequest('Audio duration must be between 250ms and 10 seconds')
      }
      const modeRaw = String(upload.voiceFields?.mode || '').trim().toLowerCase()
      const mode = modeRaw === 'accurate' || modeRaw === 'fast' ? modeRaw : undefined
      ok(res, await VoiceService.transcribeAudio({
        audioBase64: file.buffer.toString('base64'),
        mimeType: file.mimetype,
        durationMs: Number.isFinite(durationMs) ? durationMs : undefined,
        mode,
      }))
      return
    }

    if (!req.body?.audioBase64) throw ApiError.badRequest('Audio file is required')
    ok(res, await VoiceService.transcribeAudio(req.body))
  }),

  warmup: catchAsync(async (req: Request, res: Response) => {
    if (!req.auth || req.auth.role !== 'STUDENT') throw ApiError.forbidden()
    VoiceWarmupService.schedule(req.auth.id)
    ok(res, { scheduled: true })
  }),
}
