import { env } from '../../config/env'
import { VoiceProvider } from './VoiceProvider'
import { MockVoiceProvider } from './MockVoiceProvider'
import { SarvamVoiceProvider } from './SarvamVoiceProvider'
import { PythonVoiceProvider } from './PythonVoiceProvider'
import { GroqVoiceProvider } from './GroqVoiceProvider'
import { AzureVoiceProvider } from './AzureVoiceProvider'

export function getVoiceProvider(): VoiceProvider {
  // Real vendor implementations (e.g. ElevenLabs, OpenAI TTS) plug in here behind this
  // same interface. Until credentials are configured, we intentionally fall back to the
  // mock and mark responses as unavailable rather than fake a working voice pipeline.
  switch (env.voiceProvider) {
    case 'azure':
      return new AzureVoiceProvider()
    case 'groq':
      return new GroqVoiceProvider()
    case 'python':
      return new PythonVoiceProvider()
    case 'sarvam':
      return new SarvamVoiceProvider()
    default:
      return new MockVoiceProvider()
  }
}

export type { VoiceProvider } from './VoiceProvider'
