import { env } from '../../src/config/env'
import { GroqVoiceProvider } from '../../src/providers/voice/GroqVoiceProvider'

function wav(sample: number): Uint8Array {
  const bytes = new Uint8Array(46)
  const view = new DataView(bytes.buffer)
  for (const [offset, value] of [[0, 'RIFF'], [8, 'WAVE'], [12, 'fmt '], [36, 'data']] as const) {
    bytes.set(new TextEncoder().encode(value), offset)
  }
  view.setUint32(4, 38, true)
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 16000, true)
  view.setUint32(28, 32000, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  view.setUint32(40, 2, true)
  view.setInt16(44, sample, true)
  return bytes
}

describe('Groq conversation speech', () => {
  it('speaks every word of a long reply in Groq-sized chunks as one WAV', async () => {
    const oldKey = env.groqApiKey
    env.groqApiKey = 'test-key'
    const originalFetch = global.fetch
    const requested: string[] = []
    global.fetch = jest.fn(async (_url, options) => {
      const input = JSON.parse(String(options?.body)).input as string
      requested.push(input)
      return new Response(wav(requested.length), { headers: { 'content-type': 'audio/wav' } })
    }) as typeof fetch
    try {
      const text = 'I like playing cricket with my cousins because it is fun. '.repeat(5).trim()
      const result = await new GroqVoiceProvider().synthesizeStream(text, { conversation: true })
      const bytes = new Uint8Array(await new Response(result.body).arrayBuffer())
      const view = new DataView(bytes.buffer)
      const spoken = `${env.groqTtsVocalPrefix} ${text}`.trim()
      expect(requested.length).toBeGreaterThan(1)
      expect(requested.every((part) => part.length <= env.groqTtsMaxChars)).toBe(true)
      expect(requested.join(' ')).toBe(spoken)
      expect(view.getUint32(40, true)).toBe(requested.length * 2)
      expect(bytes.length).toBe(44 + requested.length * 2)
      expect(result.provider).toBe('groq-orpheus')
    } finally {
      global.fetch = originalFetch
      env.groqApiKey = oldKey
    }
  })
})
