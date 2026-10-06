import { createApp } from './app'
import { connectDatabase, gracefulShutdown } from './config/db'
import { env } from './config/env'
import { logger } from './utils/logger'

async function main() {
  await connectDatabase()

  const app = createApp()
  const server = app.listen(env.port, () => {
    logger.info(`Talkora backend listening on port ${env.port}`, { nodeEnv: env.nodeEnv })
  })

  const cleanup = async (signal: string) => {
    server.close(() => {
      logger.info('HTTP server closed')
    })
    await gracefulShutdown(signal)
  }

  process.on('SIGINT', () => cleanup('SIGINT'))
  process.on('SIGTERM', () => cleanup('SIGTERM'))
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason })
  })

  return server
}

main().catch((err) => {
  logger.error('Fatal error during startup', { err: err instanceof Error ? err.message : err })
  process.exit(1)
})
