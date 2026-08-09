// Traditional Chinese word segmentation via jieba-zh-tw (client-side lazy load).

type JiebaInstance = {
  cut: (sentence: string, useHMM?: boolean) => string[]
}

let jiebaPromise: Promise<JiebaInstance> | null = null

async function loadJieba(): Promise<JiebaInstance> {
  if (!jiebaPromise) {
    jiebaPromise = (async () => {
      const [{ default: createJieba }, dict] = await Promise.all([
        import('js-jieba'),
        import('jieba-zh-tw'),
      ])
      return createJieba(
        dict.JiebaDict,
        dict.HMMModel,
        dict.UserDict,
        dict.IDF,
        dict.StopWords,
      )
    })()
  }
  return jiebaPromise
}

/** True when the text is mostly Traditional Chinese (no kana). */
export function isChineseInput(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  const hanCount = (trimmed.match(/[\u4e00-\u9fff]/g) ?? []).length
  if (hanCount === 0) return false
  const kanaCount = (trimmed.match(/[\u3040-\u309f\u30a0-\u30ff]/g) ?? []).length
  return kanaCount === 0
}

function isSegmentableToken(token: string): boolean {
  const trimmed = token.trim()
  if (!trimmed) return false
  return /[\u4e00-\u9fff]/.test(trimmed)
}

/**
 * Segment Traditional Chinese text into word tokens.
 * Returns an empty array for non-Chinese input.
 */
export async function segmentChinese(text: string): Promise<string[]> {
  const trimmed = text.trim()
  if (!trimmed || !isChineseInput(trimmed)) return []

  const jieba = await loadJieba()
  const tokens = jieba.cut(trimmed, true)
  return tokens.filter(isSegmentableToken)
}
