import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import { env } from './config/env'
import routes from './routes'
import { errorHandler, notFoundHandler } from './middleware/error'
import { generalLimiter } from './middleware/rateLimit'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(
    cors({
      origin: Array.from(new Set([env.clientUrl, ...(process.env.CLIENT_URLS || '').split(',').map((url) => url.trim()).filter(Boolean), ...(env.isProd ? [] : ['http://localhost:3000'])])),
      credentials: true,
    }),
  )
  // Base64 audio is bounded at the voice route; allow its encoded payload through Express.
  app.use(express.json({ limit: '12mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))
  app.use(morgan(env.isProd ? 'combined' : 'dev'))
  app.use(generalLimiter)

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'talkora-backend' }))

  app.use('/api/v1', routes)
  app.use('/api', routes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
