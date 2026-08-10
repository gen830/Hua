import { ApiError, Type } from '@google/genai'
import { createGeminiClient } from './gemini-client'
import { getGeminiModelsToTry } from './gemini-config'
import { segmentChineseText } from './chinese-segment-server'
import { lookupWord } from './lookup-word'
import type { Analysis, GrammarNote, Word } from './huamaster-data'

type GeminiWord = {
  hanzi: string
  pinyin: string
  bopomofo: string
  jp: string
  pos: string
}

type GeminiAnalysisPayload = {
  sourceLang: string
  translation: string
  translationPinyin: string
  grammar: GrammarNote[]
  words: GeminiWord[]
}

const ANALYSIS_JSON_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    sourceLang: {
      type: Type.STRING,
      description: 'Detected source language label in Japanese, e.g. 日本語 or 繁體中文',
    },
    translation: {
      type: Type.STRING,
      description: 'Taiwan Mandarin translation in Traditional Chinese',
    },
    translationPinyin: {
      type: Type.STRING,
      description: 'Full-sentence Hanyu Pinyin with tone marks',
    },
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
          pinyin: { type: Type.STRING },
          bopomofo: { type: Type.STRING },
          jp: { type: Type.STRING },
          pos: { type: Type.STRING },
        },
        required: ['hanzi', 'pinyin', 'bopomofo', 'jp', 'pos'],
      },
    },
  },
  required: [
    'sourceLang',
    'translation',
    'translationPinyin',
    'grammar',
    'words',
  ],
}

function buildPrompt(source: string): string {
  return `You are HuaMaster, a Taiwan Mandarin (Traditional Chinese) tutor for Japanese speakers.

Analyze the following user input and produce a learning-friendly response.

User input:
"""
${source}
"""

Instructions:
- If the input is Japanese, translate it into natural Taiwan Mandarin (繁體中文, Taiwan usage).
- If the input is already Traditional Chinese, polish it naturally for Taiwan usage if needed; otherwise keep it.
- Never use Simplified Chinese characters.
- Prefer Taiwan vocabulary (e.g. 軟體, 影片, 公車, 捷運).
- Write grammar notes in Japanese for beginner learners (2–4 notes).
- Segment the translation into vocabulary items in reading order.
- Keep natural compound words together (e.g. 牛肉麵, not splitting into 牛肉 + 麵).
- For each word provide: hanzi, pinyin (tone marks), bopomofo (注音), Japanese meaning (jp), part of speech in Japanese (pos).
- sourceLang must be a short Japanese label such as "日本語" or "繁體中文".`
}

function toWord(raw: GeminiWord): Word {
  const known = lookupWord(raw.hanzi)
  const geminiJp = raw.jp?.trim()

  // Prefer Gemini gloss when present; fall back to offline dictionary.
  if (geminiJp) {
    return {
      hanzi: raw.hanzi,
      pinyin: raw.pinyin || known.pinyin,
      bopomofo: raw.bopomofo || known.bopomofo,
      jp: geminiJp,
      pos: raw.pos || known.pos,
    }
  }

  if (known.jp !== '（辞書未登録）') {
    return {
      ...known,
      pinyin: raw.pinyin || known.pinyin,
      bopomofo: raw.bopomofo || known.bopomofo,
      pos: raw.pos || known.pos,
    }
  }

  return {
    hanzi: raw.hanzi,
    pinyin: raw.pinyin,
    bopomofo: raw.bopomofo,
    jp: raw.jp,
    pos: raw.pos,
  }
}

function isUnresolvedWord(word: Word): boolean {
  return !word.jp?.trim() || word.jp === '（辞書未登録）'
}

/** Merge consecutive unresolved chips into a known compound (e.g. 牛肉 + 麵 → 牛肉麵). */
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
  if (!(error instanceof ApiError)) return false
  if (error.status === 404) return true
  if (error.status === 429) {
    const message = error.message ?? ''
    return message.includes('limit: 0') || message.includes('limit:0')
  }
  return false
}

async function generateAnalysis(
  source: string,
  model: string,
): Promise<Omit<Analysis, 'source'>> {
  const ai = createGeminiClient()

  const response = await ai.models.generateContent({
    model,
    contents: buildPrompt(source),
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: ANALYSIS_JSON_SCHEMA,
    },
  })

  const text = response.text
  if (!text) {
    throw new Error('Gemini returned an empty response')
  }

  const parsed = JSON.parse(text) as GeminiAnalysisPayload

  return {
    sourceLang: parsed.sourceLang,
    translation: parsed.translation,
    translationPinyin: parsed.translationPinyin,
    grammar: parsed.grammar ?? [],
    words: mergeWords(parsed.translation, parsed.words ?? []),
  }
}

export async function analyzeWithGemini(
  source: string,
): Promise<Omit<Analysis, 'source'>> {
  const models = getGeminiModelsToTry()
  let lastError: unknown

  for (const model of models) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.info(`[analyze] Trying model: ${model}`)
      }
      return await generateAnalysis(source, model)
    } catch (error) {
      lastError = error
      if (!isRetryableModelError(error)) throw error
      console.warn(`[analyze] Model unavailable: ${model}`, error)
    }
  }

  throw lastError ?? new Error('No Gemini models available')
}

export function isZeroQuotaError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 429) return false
  const message = error.message ?? ''
  return message.includes('limit: 0') || message.includes('limit:0')
}
