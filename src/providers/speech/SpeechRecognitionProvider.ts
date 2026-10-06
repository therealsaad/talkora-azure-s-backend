export interface SpeechRecognitionProvider {
  name: string
  /** Transcribes audio (base64) to text; an empty transcript means no speech was detected. */
  transcribe(input: { audioBase64: string; mimeType?: string; durationMs?: number }): Promise<{
    transcript: string | null
    available: boolean
    confidence?: number
    latencyMs?: number
    provider?: string
    model?: string
  }>
}
