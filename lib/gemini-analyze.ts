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
- For each word provide: hanzi, pinyin (tone marks), bopomofo (注音), Japanese meaning (jp), part of speech in Japanese (pos).
- sourceLang must be a short Japanese label such as "日本語" or "繁體中文".`
}

function toWord(raw: GeminiWord): Word {
  const known = lookupWord(raw.hanzi)
  if (known.jp !== '（辞書未登録）') {
    return {
      ...known,
      pinyin: raw.pinyin || known.pinyin,
      bopomofo: raw.bopomofo || known.bopomofo,
      jp: raw.jp || known.jp,
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

function mergeWords(translation: string, geminiWords: GeminiWord[]): Word[] {
  const tokens = segmentChineseText(translation)
  if (tokens.length === 0) {
    return geminiWords.map(toWord)
  }

  const byHanzi = new Map(geminiWords.map((w) => [w.hanzi, w]))

  return tokens.map((token) => {
    const fromGemini = byHanzi.get(token)
    if (fromGemini) return toWord(fromGemini)
    return lookupWord(token)
  })
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
