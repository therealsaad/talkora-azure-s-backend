import { SpeechRecognitionProvider } from './SpeechRecognitionProvider'

export class MockSpeechProvider implements SpeechRecognitionProvider {
  name = 'mock'
  async transcribe(_input: { audioBase64: string; mimeType?: string; durationMs?: number }) {
    return { transcript: null, available: false }
  }
}
