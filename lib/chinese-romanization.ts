import { p2z } from 'pinyin-to-zhuyin'
import { pinyin } from 'pinyin-pro'

/** Full-sentence Hanyu Pinyin with spaces between syllables. */
export function sentencePinyin(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  return pinyin(trimmed, { toneType: 'symbol' })
}

/** Word-level pinyin (syllables joined, e.g. niúròumiàn). */
export function wordPinyin(hanzi: string): string {
  if (!hanzi) return ''
  return pinyin(hanzi, { toneType: 'symbol', type: 'array' }).join('')
}

/** Taiwan Bopomofo / Zhuyin with spaces between syllables. */
export function wordBopomofo(hanzi: string): string {
  if (!hanzi) return ''
  const py = pinyin(hanzi, { toneType: 'symbol' })
  if (!py) return ''
  return p2z(py)
}

export function romanizeHanzi(hanzi: string): { pinyin: string; bopomofo: string } {
  return {
    pinyin: wordPinyin(hanzi),
    bopomofo: wordBopomofo(hanzi),
  }
}
