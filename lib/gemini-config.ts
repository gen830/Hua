/** Default model for translation and grammar analysis. */
export const GEMINI_MODEL =
  process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

/** Models to try when the preferred model is unavailable (deprecated / zero quota). */
export const GEMINI_MODEL_FALLBACKS = [
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash-lite',
] as const

export function getGeminiModelsToTry(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim()
  const ordered = preferred
    ? [preferred, ...GEMINI_MODEL_FALLBACKS.filter((m) => m !== preferred)]
    : [...GEMINI_MODEL_FALLBACKS]
  return [...new Set(ordered)]
}

export { resolveGeminiApiKey as getGeminiApiKey } from './gemini-client'
