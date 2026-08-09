import createJieba from 'js-jieba'
import {
  HMMModel,
  IDF,
  JiebaDict,
  StopWords,
  UserDict,
} from 'jieba-zh-tw'

let jieba: ReturnType<typeof createJieba> | null = null

function getJieba() {
  if (!jieba) {
    jieba = createJieba(JiebaDict, HMMModel, UserDict, IDF, StopWords)
  }
  return jieba
}

/** Segment Traditional Chinese text into word tokens (server-side). */
export function segmentChineseText(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  return getJieba()
    .cut(trimmed, true)
    .filter((token) => /[\u4e00-\u9fff]/.test(token))
}
