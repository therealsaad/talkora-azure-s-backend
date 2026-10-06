import dotenv from 'dotenv'
dotenv.config()

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 5000),

  mongodbUri: required('MONGODB_URI', process.env.NODE_ENV === 'test' ? 'mongodb://localhost:27017/talkora-test' : undefined),

  jwtSecret: required('JWT_SECRET', process.env.NODE_ENV === 'test' ? 'test-secret-do-not-use-in-prod' : undefined),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',

  aiProvider: (process.env.AI_PROVIDER ?? 'qwen') as 'qwen' | 'groq' | 'openai' | 'python' | 'mock',
  aiServiceUrl: process.env.AI_SERVICE_URL ?? 'http://127.0.0.1:8001',
  aiServiceApiKey: process.env.AI_SERVICE_API_KEY ?? '',
  aiServiceTimeoutMs: Number(process.env.AI_SERVICE_TIMEOUT_MS ?? 50000),
  sttTimeoutMs: Number(process.env.STT_TIMEOUT_MS ?? 120000),
  ttsTimeoutMs: Number(process.env.TTS_TIMEOUT_MS ?? 12000),
  ttsVoiceId: process.env.TTS_VOICE_ID ?? 'priya',
  ttsLoginPrewarmMaxLines: Number(process.env.TTS_LOGIN_PREWARM_MAX_LINES ?? 10),
  voicePrewarmRequestTimeoutMs: Number(process.env.VOICE_PREWARM_REQUEST_TIMEOUT_MS ?? 12000),
  qwenApiKey: process.env.QWEN_API_KEY ?? '',
  qwenApiBase: process.env.QWEN_API_BASE ?? '',
  qwenModel: process.env.QWEN_MODEL ?? '',
  groqApiKey: process.env.GROQ_API_KEY ?? '',
  groqModel: process.env.GROQ_MODEL ?? 'qwen/qwen3.6-27b',
  conversationGroqModel: process.env.CONVERSATION_GROQ_MODEL ?? 'openai/gpt-oss-20b',
  groqSttModel: process.env.GROQ_STT_MODEL ?? 'whisper-large-v3-turbo',
  groqSttAccurateModel: process.env.GROQ_STT_ACCURATE_MODEL ?? 'whisper-large-v3',
  groqSttLanguage: process.env.GROQ_STT_LANGUAGE ?? '',
  groqTtsModel: process.env.GROQ_TTS_MODEL ?? 'canopylabs/orpheus-v1-english',
  groqTtsVoice: process.env.GROQ_TTS_VOICE ?? 'diana',
  /** Orpheus vocal-direction prefix for live Miss Julie conversation (counts toward char limit). */
  groqTtsVocalPrefix: process.env.GROQ_TTS_VOCAL_PREFIX ?? '[warm, gentle, cheerful Indian English teacher voice]',
  groqTtsMaxChars: Number(process.env.GROQ_TTS_MAX_CHARS ?? 200),
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-3.6-flash',
  geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL ?? 'gemini-3.5-flash',

  azureSpeechKey: process.env.AZURE_SPEECH_KEY ?? '',
  azureSpeechRegion: process.env.AZURE_SPEECH_REGION ?? 'centralindia',
  azureSpeechSttLocale: process.env.AZURE_SPEECH_STT_LOCALE ?? 'en-IN',
  azureSpeechVoice: process.env.AZURE_SPEECH_VOICE ?? 'en-IN-NeerjaNeural',
  azureSpeechRate: process.env.AZURE_SPEECH_RATE ?? '-8%',
  azureSpeechPitch: process.env.AZURE_SPEECH_PITCH ?? '+2%',

  voiceProvider: process.env.VOICE_PROVIDER ?? 'python',
  conversationVoiceProvider: (process.env.CONVERSATION_VOICE_PROVIDER ?? 'azure') as 'azure' | 'groq' | 'python' | 'sarvam' | 'mock',
  indicf5ServiceUrl: process.env.INDICF5_SERVICE_URL ?? '',
  indicf5ApiKey: process.env.INDICF5_API_KEY ?? '',
  indicf5TimeoutMs: Number(process.env.INDICF5_TIMEOUT_MS ?? 20000),
  voiceWarmupEnabled: (process.env.VOICE_WARMUP_ENABLED ?? 'true').toLowerCase() === 'true',
  voiceWarmupMaxItems: Number(process.env.VOICE_WARMUP_MAX_ITEMS ?? 10),
  voiceWarmupTimeoutMs: Number(process.env.VOICE_WARMUP_TIMEOUT_MS ?? 180000),
  sarvamApiKey: process.env.SARVAM_API_KEY ?? '',
  sarvamTtsModel: process.env.SARVAM_TTS_MODEL ?? 'bulbul:v3',
  sarvamTtsSpeaker: process.env.SARVAM_TTS_SPEAKER ?? 'ishita',
  sarvamTtsLanguage: process.env.SARVAM_TTS_LANGUAGE ?? 'en-IN',
  sarvamTtsPace: Number(process.env.SARVAM_TTS_PACE ?? 0.92),
  sarvamTtsTemperature: Number(process.env.SARVAM_TTS_TEMPERATURE ?? 0.6),
  sarvamSttModel: process.env.SARVAM_STT_MODEL ?? 'saaras:v2.5',
  sarvamSttLanguage: process.env.SARVAM_STT_LANGUAGE ?? 'en-IN',
  sarvamTimeoutMs: Number(process.env.SARVAM_TIMEOUT_MS ?? 15000),
  speechProvider: process.env.SPEECH_PROVIDER ?? 'azure',
  pronunciationProvider: process.env.PRONUNCIATION_PROVIDER ?? 'python',

  seed: {
    schoolCode: process.env.SEED_SCHOOL_CODE ?? 'DEMO001',
    schoolPassword: process.env.SEED_SCHOOL_PASSWORD ?? 'talkora123',
    teacherEmail: process.env.SEED_TEACHER_EMAIL ?? 'teacher@demo.talkora.dev',
    teacherPassword: process.env.SEED_TEACHER_PASSWORD ?? 'teacher123',
  },
}
