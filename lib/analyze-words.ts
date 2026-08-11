import { segmentChineseText } from './chinese-segment-server'
import { romanizeHanzi } from './chinese-romanization'
import { translateTextsToJapanese } from './google-translate'
import { DICTIONARY, isChineseSourceLang, type Word } from './huamaster-data'
import { lookupMoedict } from './moedict'

function isUnresolvedWord(word: Word): boolean {
  return !word.jp?.trim() || word.jp === '（辞書未登録）'
}

function hasDictionaryGloss(hanzi: string): boolean {
  const known = DICTIONARY[hanzi]
  return Boolean(known && !isUnresolvedWord(known))
}

function wordFromDictionary(hanzi: string): Word | null {
  const known = DICTIONARY[hanzi]
  if (!known || isUnresolvedWord(known)) return null
  return known
}

function wordFromMoedict(
  hanzi: string,
  moedict: NonNullable<Awaited<ReturnType<typeof lookupMoedict>>>,
): Word {
  const local = romanizeHanzi(hanzi)
  return {
    hanzi,
    pinyin: moedict.pinyin || local.pinyin,
    bopomofo: moedict.bopomofo || local.bopomofo,
    jp: moedict.definition,
    pos: moedict.pos,
  }
}

function placeholderWord(hanzi: string): Word {
  const { pinyin, bopomofo } = romanizeHanzi(hanzi)
  return {
    hanzi,
    pinyin,
    bopomofo,
    jp: '（辞書未登録）',
    pos: '—',
  }
}

async function resolveWord(hanzi: string): Promise<Word> {
  const fromDict = wordFromDictionary(hanzi)
  if (fromDict) return fromDict

  const moedict = await lookupMoedict(hanzi)
  if (moedict) return wordFromMoedict(hanzi, moedict)

  return placeholderWord(hanzi)
}

async function coalesceWithMoedict(words: Word[]): Promise<Word[]> {
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
      const fromDict = wordFromDictionary(hanzi)
      if (fromDict) {
        result.push(fromDict)
        i = j
        merged = true
        break
      }

      const moedict = await lookupMoedict(hanzi)
      if (moedict) {
        result.push(wordFromMoedict(hanzi, moedict))
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

function needsJapaneseGloss(word: Word): boolean {
  return !isUnresolvedWord(word) && !hasDictionaryGloss(word.hanzi)
}

async function localizeWordGlosses(words: Word[]): Promise<Word[]> {
  const moedictTexts = [
    ...new Set(words.filter(needsJapaneseGloss).map((word) => word.jp.trim())),
  ]
  const unknownHanzi = [
    ...new Set(words.filter(isUnresolvedWord).map((word) => word.hanzi)),
  ]

  const [moedictJa, hanziJa] = await Promise.all([
    translateTextsToJapanese(moedictTexts),
    translateTextsToJapanese(unknownHanzi),
  ])

  return words.map((word) => {
    if (needsJapaneseGloss(word)) {
      const ja = moedictJa.get(word.jp.trim())
      if (ja) return { ...word, jp: ja }
    }

    if (isUnresolvedWord(word)) {
      const ja = hanziJa.get(word.hanzi)
      if (ja) return { ...word, jp: ja }
    }

    return word
  })
}

/** jieba → Moedict / local dict → Google Translate for Japanese glosses. */
export async function analyzeWords(
  source: string,
  translation: string,
  sourceLang: string,
): Promise<{ words: Word[] }> {
  const chineseText = isChineseSourceLang(sourceLang) ? source : translation
  const tokens = segmentChineseText(chineseText)
  let words = await Promise.all(tokens.map((token) => resolveWord(token)))
  words = await coalesceWithMoedict(words)
  words = await localizeWordGlosses(words)

  return { words }
}
