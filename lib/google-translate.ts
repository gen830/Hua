import { sentencePinyin } from './chinese-romanization'
import type { GeminiTranslateResult } from './gemini-analyze'

const TRANSLATE_ENDPOINT =
  'https://translation.googleapis.com/language/translate/v2'
const DETECT_ENDPOINT =
  'https://translation.googleapis.com/language/translate/v2/detect'

type GoogleTranslateResponse = {
  data?: {
    translations?: Array<{
      translatedText?: string
      detectedSourceLanguage?: string
    }>
  }
  error?: {
    code?: number
    message?: string
    status?: string
  }
}

type GoogleDetectResponse = {
  data?: {
    detections?: Array<
      Array<{
        language?: string
        confidence?: number
      }>
    >
  }
  error?: {
    code?: number
    message?: string
    status?: string
  }
}

export function resolveGoogleTranslateApiKey(): string | null {
  const key =
    process.env.GOOGLE_TRANSLATE_API_KEY?.trim() ??
    process.env.GOOGLE_CLOUD_API_KEY?.trim()
  return key || null
}

function formatGoogleTranslateError(
  status: number,
  message: string | undefined,
): string {
  const detail = message?.trim()

  if (status === 400) {
    return detail
      ? `Google Translation API リクエストが不正です: ${detail}`
      : 'Google Translation API リクエストが不正です。'
  }
  if (status === 403) {
    return 'Google Translation API が有効化されていないか、API キーが無効です。Google Cloud Console で Cloud Translation API を有効化し、GOOGLE_TRANSLATE_API_KEY を確認してください。'
  }
  if (status === 429) {
    return 'Google Translation API の利用上限に達しました。しばらく待ってから再試行してください。'
  }

  return detail
    ? `Google Translation API エラー (${status}): ${detail}`
    : `Google Translation API エラー (${status})`
}

async function callGoogleTranslateApi<T>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> {
  const apiKey = resolveGoogleTranslateApiKey()
  if (!apiKey) {
    throw new Error('GOOGLE_TRANSLATE_API_KEY is not configured')
  }

  const res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const payload = (await res.json()) as T & {
    error?: { code?: number; message?: string }
  }

  if (!res.ok) {
    throw new Error(
      formatGoogleTranslateError(
        payload.error?.code ?? res.status,
        payload.error?.message,
      ),
    )
  }

  if (payload.error?.message) {
    throw new Error(
      formatGoogleTranslateError(
        payload.error.code ?? 500,
        payload.error.message,
      ),
    )
  }

  return payload
}

async function detectLanguage(text: string): Promise<string> {
  const payload = await callGoogleTranslateApi<GoogleDetectResponse>(
    DETECT_ENDPOINT,
    { q: text },
  )

  const language = payload.data?.detections?.[0]?.[0]?.language?.trim()
  return language || 'ja'
}

function sourceLangLabel(language: string): string {
  if (language === 'ja') return '日本語'
  if (language.startsWith('zh')) return '繁體中文'
  return language
}

function pickTargetLanguage(sourceLanguage: string): 'ja' | 'zh-TW' {
  if (sourceLanguage === 'ja') return 'zh-TW'
  if (sourceLanguage.startsWith('zh')) return 'ja'
  return 'zh-TW'
}

/** Fast path: Google Cloud Translation (ja ↔ zh-TW). */
export async function translateWithGoogle(
  source: string,
): Promise<GeminiTranslateResult> {
  const detected = await detectLanguage(source)
  const target = pickTargetLanguage(detected)

  const payload = await callGoogleTranslateApi<GoogleTranslateResponse>(
    TRANSLATE_ENDPOINT,
    {
      q: source,
      source: detected,
      target,
      format: 'text',
    },
  )

  const translation = payload.data?.translations?.[0]?.translatedText?.trim()
  if (!translation) {
    throw new Error('Google Translation API returned an empty translation')
  }

  return {
    sourceLang: sourceLangLabel(detected),
    translation,
    translationPinyin:
      target === 'zh-TW' ? sentencePinyin(translation) : '',
  }
}
