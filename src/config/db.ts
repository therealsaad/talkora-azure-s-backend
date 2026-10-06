import mongoose from 'mongoose'
import { env } from './env'
import { logger } from '../utils/logger'

let isConnecting = false

export async function connectDatabase(): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true)

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'))
  mongoose.connection.on('error', (err) => logger.error('MongoDB connection error', { err: err.message }))
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'))

  if (isConnecting) return mongoose
  isConnecting = true

  try {
    await mongoose.connect(env.mongodbUri, {
      autoIndex: !env.isProd,
      serverSelectionTimeoutMS: 10000,
    })
    return mongoose
  } catch (err) {
    logger.error('Failed to connect to MongoDB', { err })
    throw err
  } finally {
    isConnecting = false
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect()
}

export async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully`)
  await disconnectDatabase()
  process.exit(0)
}
