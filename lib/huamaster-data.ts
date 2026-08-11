// HuaMaster shared types and offline vocabulary lookup.
// Translation uses Google Cloud Translation; grammar uses Gemini on demand.
// Word breakdown uses jieba + Moedict, with Google Translate for Japanese glosses.

export type Word = {
  /** Traditional Chinese surface form, e.g. 牛肉麵 */
  hanzi: string
  /** Hanyu Pinyin with tone marks, e.g. niúròumiàn */
  pinyin: string
  /** Bopomofo / Zhuyin, e.g. ㄋㄧㄡˊ ㄖㄡˋ ㄇㄧㄢˋ */
  bopomofo: string
  /** Japanese meaning */
  jp: string
  /** Rough part of speech (Japanese label) */
  pos: string
}

export type ReviewStatus = 'reviewing' | 'mastered'

export type NotebookEntry = Word & {
  id: string
  status: ReviewStatus
  addedAt: number
}

export type GrammarNote = {
  title: string
  detail: string
}

export type SentenceEntry = {
  id: string
  source: string
  sourceLang: string
  translation: string
  translationPinyin: string
  sourcePinyin: string
  words: Word[]
  grammar: GrammarNote[]
  addedAt: number
}

export type Analysis = {
  /** The source text the user entered */
  source: string
  /** Detected source language label */
  sourceLang: string
  /** Translated sentence (TW Mandarin when source is Japanese, Japanese when source is Chinese) */
  translation: string
  /** Pinyin for the Chinese sentence shown for study (translation or source) */
  translationPinyin: string
  /** Pinyin for source when the user entered Traditional Chinese */
  sourcePinyin: string
  /** Segmented words for the Chinese sentence being studied */
  words: Word[]
  /** Beginner-friendly grammar notes */
  grammar: GrammarNote[]
}

export function isChineseSourceLang(sourceLang: string): boolean {
  return sourceLang === '繁體中文' || sourceLang.includes('中文')
}

/** Chinese text used for word segmentation and TTS. */
export function chineseStudyText(analysis: Pick<Analysis, 'source' | 'translation' | 'sourceLang'>): string {
  return isChineseSourceLang(analysis.sourceLang)
    ? analysis.source
    : analysis.translation
}

export function chineseStudyPinyin(analysis: Pick<Analysis, 'sourcePinyin' | 'translationPinyin' | 'sourceLang'>): string {
  return isChineseSourceLang(analysis.sourceLang)
    ? analysis.sourcePinyin
    : analysis.translationPinyin
}

// Core vocabulary database — reused across samples and word lookups.
export const DICTIONARY: Record<string, Word> = {
  我: { hanzi: '我', pinyin: 'wǒ', bopomofo: 'ㄨㄛˇ', jp: '私・わたし', pos: '代名詞' },
  你: { hanzi: '你', pinyin: 'nǐ', bopomofo: 'ㄋㄧˇ', jp: 'あなた', pos: '代名詞' },
  想: { hanzi: '想', pinyin: 'xiǎng', bopomofo: 'ㄒㄧㄤˇ', jp: '〜したい／思う', pos: '助動詞' },
  吃: { hanzi: '吃', pinyin: 'chī', bopomofo: 'ㄔ', jp: '食べる', pos: '動詞' },
  喝: { hanzi: '喝', pinyin: 'hē', bopomofo: 'ㄏㄜ', jp: '飲む', pos: '動詞' },
  牛肉麵: {
    hanzi: '牛肉麵',
    pinyin: 'niúròumiàn',
    bopomofo: 'ㄋㄧㄡˊ ㄖㄡˋ ㄇㄧㄢˋ',
    jp: '牛肉麺（ニュウロウメン）',
    pos: '名詞',
  },
  珍珠奶茶: {
    hanzi: '珍珠奶茶',
    pinyin: 'zhēnzhū nǎichá',
    bopomofo: 'ㄓㄣ ㄓㄨ ㄋㄞˇ ㄔㄚˊ',
    jp: 'タピオカミルクティー',
    pos: '名詞',
  },
  廁所: { hanzi: '廁所', pinyin: 'cèsuǒ', bopomofo: 'ㄘㄜˋ ㄙㄨㄛˇ', jp: 'トイレ・お手洗い', pos: '名詞' },
  在: { hanzi: '在', pinyin: 'zài', bopomofo: 'ㄗㄞˋ', jp: '〜にある／いる', pos: '動詞' },
  哪裡: { hanzi: '哪裡', pinyin: 'nǎlǐ', bopomofo: 'ㄋㄚˇ ㄌㄧˇ', jp: 'どこ', pos: '疑問詞' },
  這個: { hanzi: '這個', pinyin: 'zhège', bopomofo: 'ㄓㄜˋ ㄍㄜˋ', jp: 'これ', pos: '代名詞' },
  多少: { hanzi: '多少', pinyin: 'duōshǎo', bopomofo: 'ㄉㄨㄛ ㄕㄠˇ', jp: 'どのくらい／いくつ', pos: '疑問詞' },
  錢: { hanzi: '錢', pinyin: 'qián', bopomofo: 'ㄑㄧㄢˊ', jp: 'お金', pos: '名詞' },
  謝謝: { hanzi: '謝謝', pinyin: 'xièxie', bopomofo: 'ㄒㄧㄝˋ ㄒㄧㄝ˙', jp: 'ありがとう', pos: '感嘆詞' },
  請: { hanzi: '請', pinyin: 'qǐng', bopomofo: 'ㄑㄧㄥˇ', jp: 'どうぞ／〜してください', pos: '動詞' },
  給: { hanzi: '給', pinyin: 'gěi', bopomofo: 'ㄍㄟˇ', jp: '〜に与える', pos: '動詞' },
  我們: { hanzi: '我們', pinyin: 'wǒmen', bopomofo: 'ㄨㄛˇ ㄇㄣ˙', jp: '私たち', pos: '代名詞' },
  一: { hanzi: '一', pinyin: 'yì', bopomofo: 'ㄧˋ', jp: '一つの', pos: '数詞' },
  碗: { hanzi: '碗', pinyin: 'wǎn', bopomofo: 'ㄨㄢˇ', jp: '〜杯（丼の量詞）', pos: '量詞' },
  杯: { hanzi: '杯', pinyin: 'bēi', bopomofo: 'ㄅㄟ', jp: '〜杯（コップの量詞）', pos: '量詞' },
}
