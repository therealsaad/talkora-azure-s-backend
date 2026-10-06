import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/ApiError'

type VoiceUploadRequest = Request & {
  voiceFile?: { buffer: Buffer; mimetype: string; originalname: string; size: number }
  voiceFields?: Record<string, string>
}

export async function parseVoiceUpload(req: Request, _res: Response, next: NextFunction) {
  if (!req.is('multipart/form-data')) return next()
  const contentType = req.headers['content-type'] || ''
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[1] || contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[2]
  if (!boundary) return next(ApiError.badRequest('Multipart boundary is missing'))
  const chunks: Buffer[] = []
  let total = 0
  req.on('data', (chunk: Buffer) => {
    total += chunk.length
    if (total <= 15 * 1024 * 1024) chunks.push(chunk)
  })
  req.on('error', () => next(ApiError.badRequest('Invalid multipart audio upload')))
  req.on('end', () => {
    if (total > 15 * 1024 * 1024) return next(ApiError.payloadTooLarge('Audio file is too large'))
    const body = Buffer.concat(chunks)
    const delimiter = Buffer.from(`--${boundary}`)
    const fields: Record<string, string> = {}
    let audio: VoiceUploadRequest['voiceFile']
    let offset = body.indexOf(delimiter)
    while (offset !== -1) {
      const partStart = offset + delimiter.length + 2
      const nextDelimiter = body.indexOf(delimiter, partStart)
      if (nextDelimiter === -1) break
      const part = body.subarray(partStart, Math.max(partStart, nextDelimiter - 2))
      const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'))
      if (headerEnd === -1) break
      const headers = part.subarray(0, headerEnd).toString('utf8')
      const value = part.subarray(headerEnd + 4)
      const name = headers.match(/name="([^"]+)"/i)?.[1]
      if (name === 'audio') {
        audio = { buffer: value, mimetype: headers.match(/Content-Type:\s*([^\r\n]+)/i)?.[1]?.trim() || '', originalname: headers.match(/filename="([^"]*)"/i)?.[1] || 'student-speech', size: value.length }
      } else if (name) fields[name] = value.toString('utf8')
      offset = nextDelimiter
    }
    const upload = req as VoiceUploadRequest
    upload.voiceFile = audio
    upload.voiceFields = fields
    req.body = fields
    next()
  })
}

export type { VoiceUploadRequest }
