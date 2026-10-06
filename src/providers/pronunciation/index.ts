import { env } from '../../config/env'
import { PronunciationProvider } from './PronunciationProvider'
import { MockPronunciationProvider } from './MockPronunciationProvider'
import { PythonPronunciationProvider } from './PythonPronunciationProvider'

export function getPronunciationProvider(): PronunciationProvider {
  switch (env.pronunciationProvider) {
    case 'python':
      return new PythonPronunciationProvider()
    default:
      return new MockPronunciationProvider()
  }
}

export type { PronunciationProvider } from './PronunciationProvider'
