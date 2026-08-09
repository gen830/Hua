import { GoogleGenAI } from '@google/genai'

/** New Google AI Studio authorization keys (2025+). */
export function isAuthKeyFormat(key: string): boolean {
  return key.startsWith('AQ.')
}

/** Legacy Google API keys. */
export function isLegacyApiKeyFormat(key: string): boolean {
  return key.startsWith('AIza')
}

/**
 * Resolve the Gemini API key from environment variables.
 * Prefers GEMINI_API_KEY (HuaMaster convention) over GOOGLE_API_KEY.
 */
export function resolveGeminiApiKey(): string | undefined {
  const gemini = process.env.GEMINI_API_KEY?.trim()
  if (gemini) return gemini

  const google = process.env.GOOGLE_API_KEY?.trim()
  if (google) return google

  return undefined
}

export function describeApiKeyFormat(key: string): string {
  if (isAuthKeyFormat(key)) return 'AQ (authorization key)'
  if (isLegacyApiKeyFormat(key)) return 'AIza (legacy API key)'
  return 'unknown format'
}

/** Create a Gemini client with an explicitly passed API key (AQ. and AIza supported). */
export function createGeminiClient(): GoogleGenAI {
  const apiKey = resolveGeminiApiKey()
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  return new GoogleGenAI({ apiKey })
}
