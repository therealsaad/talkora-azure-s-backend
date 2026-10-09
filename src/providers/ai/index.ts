import { env } from '../../config/env'
import { AIProvider } from './AIProvider'
import { QwenProvider } from './QwenProvider'
import { GroqProvider } from './GroqProvider'
import { OpenAIProvider } from './OpenAIProvider'
import { MockAIProvider } from './MockAIProvider'
import { PythonAIProvider } from './PythonAIProvider'

export function getAIProvider(): AIProvider {
  switch (env.aiProvider) {
    case 'qwen':
      return new QwenProvider()
    case 'python':
      return new PythonAIProvider()
    case 'groq':
      return new GroqProvider()
    case 'openai':
      return new OpenAIProvider()
    case 'mock':
      return new MockAIProvider()
    default:
      throw new Error(`Unsupported AI_PROVIDER: ${String(env.aiProvider)}`)
  }
}

export type { AIProvider, MissJulieContext } from './AIProvider'
