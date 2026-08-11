import { ApiError, Type } from '@google/genai'
import { sentencePinyin } from './chinese-romanization'
import { createGeminiClient } from './gemini-client'
import { getGeminiModelsToTry } from './gemini-config'
import { segmentChineseText } from './chinese-segment-server'
import { lookupWord } from './lookup-word'
import type { Analysis, GrammarNote, Word } from './huamaster-data'

type GeminiWord = {
  hanzi: string
  jp: string
  pos: string
}

type GeminiTranslatePayload = {
  sourceLang: string
  translation: string
}

type GeminiDetailsPayload = {
  grammar: GrammarNote[]
  words: GeminiWord[]
}

export type GeminiTranslateResult = {
  sourceLang: string
  translation: string
  translationPinyin: string
}

export type GeminiDetailsResult = {
  grammar: GrammarNote[]
  words: Word[]
}

const TRANSLATE_JSON_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    sourceLang: {
      type: Type.STRING,
      description: 'Short Japanese label, e.g. 日本語 or 繁體中文',
    },
    translation: {
      type: Type.STRING,
      description: 'Taiwan Mandarin in Traditional Chinese',
    },
  },
  required: ['sourceLang', 'translation'],
}

const DETAILS_JSON_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    grammar: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          detail: { type: Type.STRING },
        },
        required: ['title', 'detail'],
      },
    },
    words: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          hanzi: { type: Type.STRING },
          jp: { type: Type.STRING },
          pos: { type: Type.STRING },
        },
        required: ['hanzi', 'jp', 'pos'],
      },
    },
  },
  required: ['grammar', 'words'],
}

function buildTranslatePrompt(source: string): string {
  return `Translate into natural Taiwan Mandarin (繁體中文). Never use Simplified Chinese. Prefer Taiwan vocabulary.

Input:
"""
${source}
"""

Return JSON only:
- sourceLang: short Japanese label (日本語 or 繁體中文)
- translation: Taiwan Mandarin sentence`
}

function buildDetailsPrompt(source: string, translation: string): string {
  return `You are HuaMaster, a Taiwan Mandarin tutor for Japanese speakers.

Source:
"""
${source}
"""

Translation (Traditional Chinese, Taiwan):
"""
${translation}
"""

Return JSON only:
- grammar: 2–3 beginner-friendly notes in Japanese (title + detail)
- words: vocabulary in reading order; keep compounds together (e.g. 牛肉麵); each with hanzi, jp (Japanese gloss), pos (Japanese part-of-speech label)
- Do NOT output pinyin or bopomofo`
}

function toWord(raw: GeminiWord): Word {
  const known = lookupWord(raw.hanzi)
  const geminiJp = raw.jp?.trim()

  if (geminiJp) {
    return {
      hanzi: raw.hanzi,
      pinyin: known.pinyin,
      bopomofo: known.bopomofo,
      jp: geminiJp,
      pos: raw.pos || known.pos,
    }
  }

  if (known.jp !== '（辞書未登録）') {
    return {
      ...known,
      pos: raw.pos || known.pos,
    }
  }

  return {
    ...known,
    pos: raw.pos || known.pos,
  }
}

function isUnresolvedWord(word: Word): boolean {
  return !word.jp?.trim() || word.jp === '（辞書未登録）'
}

function coalesceWords(words: Word[], geminiWords: GeminiWord[]): Word[] {
  const byHanzi = new Map(geminiWords.map((w) => [w.hanzi, w]))
  const result: Word[] = []
  let i = 0

  while (i < words.length) {
    if (!isUnresolvedWord(words[i]!)) {
      result.push(words[i]!)
      i++
      continue
    }

    let merged = false
    for (let j = words.length; j > i; j--) {
      const slice = words.slice(i, j)
      if (!slice.some(isUnresolvedWord)) continue

      const hanzi = slice.map((w) => w.hanzi).join('')
      const gw = byHanzi.get(hanzi)
      if (gw?.jp?.trim()) {
        result.push(toWord(gw))
        i = j
        merged = true
        break
      }

      const known = lookupWord(hanzi)
      if (!isUnresolvedWord(known)) {
        result.push(known)
        i = j
        merged = true
        break
      }
    }

    if (!merged) {
      result.push(words[i]!)
      i++
    }
  }

  return result
}

function alignTranslationToWords(
  translation: string,
  byHanzi: Map<string, GeminiWord>,
): Word[] {
  const result: Word[] = []
  const chars = [...translation]
  let i = 0

  while (i < chars.length) {
    if (!/[\u4e00-\u9fff]/.test(chars[i]!)) {
      i++
      continue
    }

    let best: { len: number; word: Word } | null = null

    for (let len = chars.length - i; len >= 1; len--) {
      const slice = chars.slice(i, i + len).join('')
      if (!/^[\u4e00-\u9fff]+$/.test(slice)) continue

      const gw = byHanzi.get(slice)
      if (gw?.jp?.trim()) {
        const word = toWord(gw)
        if (!best || len > best.len) best = { len, word }
      }

      const known = lookupWord(slice)
      if (!isUnresolvedWord(known)) {
        if (!best || len > best.len) best = { len, word: known }
      }
    }

    if (best) {
      result.push(best.word)
      i += best.len
      continue
    }

    const ch = chars[i]!
    const gw = byHanzi.get(ch)
    result.push(gw ? toWord(gw) : lookupWord(ch))
    i++
  }

  return result
}

function mergeWords(translation: string, geminiWords: GeminiWord[]): Word[] {
  if (geminiWords.length === 0) {
    return segmentChineseText(translation).map(lookupWord)
  }

  const byHanzi = new Map(geminiWords.map((w) => [w.hanzi, w]))
  return coalesceWords(
    alignTranslationToWords(translation, byHanzi),
    geminiWords,
  )
}

function isRetryableModelError(error: unknown): boolean {
  if (error instanceof SyntaxError) return true
  if (!(error instanceof ApiError)) return false
  if (error.status === 404) return true
  if (error.status === 429) {
    const message = error.message ?? ''
    return message.includes('limit: 0') || message.includes('limit:0')
  }
  return false
}

function parseGeminiJson<T>(text: string): T {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed) as T
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim()
    if (fenced) {
      return JSON.parse(fenced) as T
    }
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T
    }
    throw new SyntaxError(
      `Gemini JSON parse failed: ${trimmed.slice(0, 80)}${trimmed.length > 80 ? '…' : ''}`,
    )
  }
}

async function callGeminiJson<T>(
  prompt: string,
  schema: object,
  maxOutputTokens: number,
  model: string,
): Promise<T> {
  const ai = createGeminiClient()

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
      maxOutputTokens,
      temperature: 0.2,
    },
  })

  const text = response.text
  if (!text) {
    throw new Error('Gemini returned an empty response')
  }

  if (process.env.NODE_ENV === 'development') {
    console.info(`[gemini] ${model} raw (${text.length} chars):`, text.slice(0, 200))
  }

  return parseGeminiJson<T>(text)
}

async function withGeminiModels<T>(
  label: string,
  run: (model: string) => Promise<T>,
): Promise<T> {
  const models = getGeminiModelsToTry()
  let lastError: unknown

  for (const model of models) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.info(`[${label}] Trying model: ${model}`)
      }
      return await run(model)
    } catch (error) {
      lastError = error
      if (!isRetryableModelError(error)) throw error
      console.warn(`[${label}] Model unavailable: ${model}`, error)
    }
  }

  throw lastError ?? new Error('No Gemini models available')
}

/** Fast path: translation only (shown first in the UI). */
export async function translateWithGemini(
  source: string,
): Promise<GeminiTranslateResult> {
  return withGeminiModels('translate', async (model) => {
    const parsed = await callGeminiJson<GeminiTranslatePayload>(
      buildTranslatePrompt(source),
      TRANSLATE_JSON_SCHEMA,
      1024,
      model,
    )

    return {
      sourceLang: parsed.sourceLang,
      translation: parsed.translation,
      translationPinyin: sentencePinyin(parsed.translation),
    }
  })
}

/** Slower path: grammar + word glosses (loaded after translation). */
export async function analyzeDetailsWithGemini(
  source: string,
  translation: string,
): Promise<GeminiDetailsResult> {
  return withGeminiModels('details', async (model) => {
    const parsed = await callGeminiJson<GeminiDetailsPayload>(
      buildDetailsPrompt(source, translation),
      DETAILS_JSON_SCHEMA,
      2048,
      model,
    )

    return {
      grammar: parsed.grammar ?? [],
      words: mergeWords(translation, parsed.words ?? []),
    }
  })
}

/** Single-call fallback (translate + details sequentially on server). */
export async function analyzeWithGemini(
  source: string,
): Promise<Omit<Analysis, 'source'>> {
  const { translateWithGoogle } = await import('./google-translate')
  const translated = await translateWithGoogle(source)
  const details = await analyzeDetailsWithGemini(source, translated.translation)

  return {
    ...translated,
    ...details,
  }
}

export function isZeroQuotaError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 429) return false
  const message = error.message ?? ''
  return message.includes('limit: 0') || message.includes('limit:0')
}
