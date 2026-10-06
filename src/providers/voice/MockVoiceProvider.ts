import { VoiceProvider } from './VoiceProvider'

/** Development fallback — makes no external call and clearly marks itself unavailable. */
export class MockVoiceProvider implements VoiceProvider {
  name = 'mock'
  async synthesize(_text: string) {
    return { audioUrl: null, available: false, provider: this.name }
  }
}
