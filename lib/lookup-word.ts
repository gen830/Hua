import { romanizeHanzi } from './chinese-romanization'
import { DICTIONARY, type Word } from './huamaster-data'

const wordCache = new Map<string, Word>()

/** Build a Word object from hanzi, using the demo dictionary when available. */
export function lookupWord(hanzi: string): Word {
  const cached = wordCache.get(hanzi)
  if (cached) return cached

  const known = DICTIONARY[hanzi]
  if (known) {
    wordCache.set(hanzi, known)
    return known
  }

  const { pinyin, bopomofo } = romanizeHanzi(hanzi)
  const word: Word = {
    hanzi,
    pinyin,
    bopomofo,
    jp: '（辞書未登録）',
    pos: '—',
  }
  wordCache.set(hanzi, word)
  return word
}

export function lookupWords(tokens: string[]): Word[] {
  return tokens.map(lookupWord)
}
