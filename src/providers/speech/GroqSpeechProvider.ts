import { env } from '../../config/env'
import { SpeechRecognitionProvider } from './SpeechRecognitionProvider'
import { ApiError } from '../../utils/ApiError'
import { logger } from '../../utils/logger'

const GROQ_TRANSCRIBE_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions'

function extensionFor(
  mimeType?: string,
): string {
  const mime =
    (mimeType || '')
      .split(';', 1)[0]
      .trim()
      .toLowerCase()

  if (mime.includes('wav')) {
    return '.wav'
  }

  if (
    mime.includes('mpeg') ||
    mime.includes('mp3')
  ) {
    return '.mp3'
  }

  if (
    mime.includes('mp4') ||
    mime.includes('m4a') ||
    mime.includes('x-m4a')
  ) {
    return '.m4a'
  }

  if (mime.includes('ogg')) {
    return '.ogg'
  }

  if (mime.includes('flac')) {
    return '.flac'
  }

  return '.webm'
}

function normalizeLanguage(
  value?: string,
): string {
  const raw =
    (value || '')
      .trim()
      .toLowerCase()

  if (!raw) {
    return 'en'
  }

  const aliases: Record<string, string> = {
    english: 'en',
    en: 'en',
    'en-in': 'en',
    'en_in': 'en',
    'en-us': 'en',
    'en_us': 'en',
    hindi: 'hi',
    hi: 'hi',
    'hi-in': 'hi',
    'hi_in': 'hi',
  }

  if (aliases[raw]) {
    return aliases[raw]
  }

  const base =
    raw.split(/[-_]/, 1)[0] ||
    'en'

  return aliases[base] || base
}

function looksLikeLeakedPrompt(
  text: string,
): boolean {
  const normalized =
    text
      .toLowerCase()
      .replace(
        /[^a-z\s]/g,
        ' ',
      )
      .replace(
        /\s+/g,
        ' ',
      )
      .trim()

  return (
    normalized.includes(
      'preserve student names and common indian words',
    ) ||
    normalized.includes(
      'preserve names and common indian words',
    ) ||
    normalized.includes(
      'a school student is speaking english with an indian accent',
    )
  )
}

export class GroqSpeechProvider
  implements SpeechRecognitionProvider
{
  name =
    'groq-whisper'

  async transcribe(input: {
    audioBase64: string

    mimeType?: string

    durationMs?: number

    /** fast = turbo (live chat); accurate = whisper-large-v3 (syllabus / pronunciation) */
    mode?: 'fast' | 'accurate'
  }) {
    const apiKey =
      env.groqApiKey?.trim()

    if (!apiKey) {
      throw ApiError.provider(
        'STT_FAILED: GROQ_API_KEY is missing',
      )
    }

    const startedAt =
      Date.now()

    const bytes =
      Buffer.from(
        input.audioBase64,
        'base64',
      )

    if (!bytes.length) {
      throw ApiError.badRequest(
        'Audio payload is empty',
      )
    }

    const mimeType =
      (
        input.mimeType ||
        'audio/webm'
      )
        .split(';', 1)[0]
        .trim()

    const accurateModel =
      env.groqSttAccurateModel?.trim() ||
      'whisper-large-v3'
    const fastModel =
      env.groqSttModel?.trim() ||
      'whisper-large-v3-turbo'
    const model =
      input.mode === 'accurate'
        ? accurateModel
        : fastModel

    const language =
      normalizeLanguage(
        env.groqSttLanguage,
      )

    const form =
      new FormData()

    form.append(
      'file',
      new Blob(
        [bytes],
        {
          type:
            mimeType,
        },
      ),
      `student-speech${extensionFor(
        mimeType,
      )}`,
    )

    form.append(
      'model',
      model,
    )

    form.append(
      'response_format',
      'json',
    )

    form.append(
      'temperature',
      '0',
    )

    form.append(
      'language',
      language,
    )

    /*
     * IMPORTANT:
     *
     * DO NOT send a Whisper prompt like:
     *
     * "Preserve student names..."
     *
     * Whisper can hallucinate that prompt
     * into the student's transcript.
     */

    let response:
      Response

    try {
      response =
        await fetch(
          GROQ_TRANSCRIBE_URL,
          {
            method:
              'POST',

            headers: {
              Authorization:
                `Bearer ${apiKey}`,
            },

            body:
              form,

            signal:
              AbortSignal.timeout(
                env.sttTimeoutMs,
              ),
          },
        )
    } catch (error) {
      logger.error(
        'Groq STT request failed before response',
        {
          error:
            error instanceof Error
              ? error.message
              : String(
                  error,
                ),

          model,

          language,

          mimeType,

          bytes:
            bytes.length,

          durationMs:
            input.durationMs,
        },
      )

      throw ApiError.provider(
        'STT_FAILED: unable to reach Groq',
      )
    }

    const raw =
      await response.text()

    if (!response.ok) {
      logger.error(
        'Groq STT returned an error',
        {
          status:
            response.status,

          detail:
            raw.slice(
              0,
              700,
            ),

          model,

          language,

          mimeType,

          bytes:
            bytes.length,

          durationMs:
            input.durationMs,
        },
      )

      throw ApiError.provider(
        `STT_FAILED: Groq returned ${response.status}`,
      )
    }

    let result: {
      text?: string
    }

    try {
      result =
        JSON.parse(
          raw,
        ) as {
          text?: string
        }
    } catch {
      logger.error(
        'Groq STT returned invalid JSON',
        {
          detail:
            raw.slice(
              0,
              700,
            ),
        },
      )

      throw ApiError.provider(
        'STT_FAILED: invalid Groq response',
      )
    }

    const transcript =
      result.text?.trim() ||
      ''

    if (!transcript) {
      throw ApiError.provider(
        'STT_FAILED: no speech detected',
      )
    }

    if (
      looksLikeLeakedPrompt(
        transcript,
      )
    ) {
      logger.warn(
        'Groq STT rejected leaked prompt text',
        {
          model,

          durationMs:
            input.durationMs,
        },
      )

      throw ApiError.provider(
        'STT_FAILED: unclear audio; please speak again',
      )
    }

    const latencyMs =
      Date.now() -
      startedAt

    logger.info(
      'Groq STT completed',
      {
        provider:
          this.name,

        model,

        language,

        latencyMs,

        transcriptLength:
          transcript.length,
      },
    )

    return {
      transcript,

      available:
        true,

      latencyMs,

      provider:
        this.name,

      model,
    }
  }
}