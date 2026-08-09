'use client'

import { useEffect, useState } from 'react'
import { isChineseInput, segmentChinese } from './chinese-segment'
import { lookupWords } from './lookup-word'
import type { Word } from './huamaster-data'

type SegmentState = {
  words: Word[]
  loading: boolean
  ready: boolean
  error: string | null
}

const EMPTY: SegmentState = {
  words: [],
  loading: false,
  ready: false,
  error: null,
}

/**
 * Debounced live segmentation for Traditional Chinese text input.
 * Returns word objects suitable for WordChip rendering.
 */
export function useChineseSegment(text: string, debounceMs = 200): SegmentState {
  const [state, setState] = useState<SegmentState>(EMPTY)

  useEffect(() => {
    const trimmed = text.trim()

    if (!trimmed || !isChineseInput(trimmed)) {
      setState(EMPTY)
      return
    }

    let cancelled = false
    setState((prev) => ({ ...prev, loading: true, error: null }))

    const timer = window.setTimeout(async () => {
      try {
        const tokens = await segmentChinese(trimmed)
        if (cancelled) return
        setState({
          words: lookupWords(tokens),
          loading: false,
          ready: true,
          error: null,
        })
      } catch {
        if (cancelled) return
        setState({
          words: [],
          loading: false,
          ready: false,
          error: '分詞エンジンの読み込みに失敗しました',
        })
      }
    }, debounceMs)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [text, debounceMs])

  return state
}
