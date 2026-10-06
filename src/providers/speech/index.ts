import { env } from '../../config/env'
import { SpeechRecognitionProvider } from './SpeechRecognitionProvider'
import { MockSpeechProvider } from './MockSpeechProvider'
import { SarvamSpeechProvider } from './SarvamSpeechProvider'
import { PythonSpeechProvider } from './PythonSpeechProvider'
import { GroqSpeechProvider } from './GroqSpeechProvider'
import { AzureSpeechProvider } from './AzureSpeechProvider'

export function getSpeechProvider(): SpeechRecognitionProvider {
  switch (env.speechProvider) {
    case 'azure':
      return new AzureSpeechProvider()
    case 'groq':
      return new GroqSpeechProvider()
    case 'python':
    case 'faster-whisper':
      return new PythonSpeechProvider()
    case 'sarvam':
      return new SarvamSpeechProvider()
    default:
      return new MockSpeechProvider()
  }
}

export type { SpeechRecognitionProvider } from './SpeechRecognitionProvider'
