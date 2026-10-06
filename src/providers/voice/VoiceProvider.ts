export interface VoiceProvider {
  name: string

  /** Compatibility path for callers that need a complete audio payload. */
  synthesize(text: string): Promise<VoiceSynthesisResult>

  /** Low-latency streaming path used by the student client. */
  synthesizeStream?(text: string): Promise<VoiceStreamResult>

  /**
   * Queue fixed curriculum speech into the provider's shared audio cache.
   * Implementations should return quickly; login must never wait for generation.
   */
  prewarm?(texts: string[]): Promise<VoicePrewarmResult>
}

export interface VoiceSynthesisResult {
  audioUrl: string | null
  audioBase64?: string
  contentType?: string
  available: boolean
  provider: string
}

export interface VoiceStreamResult {
  body: ReadableStream<Uint8Array>
  contentType: string
  provider: string
  metadata?: Record<string, string>
}

export interface VoicePrewarmResult {
  accepted: number
  pending?: number
  provider: string
}
