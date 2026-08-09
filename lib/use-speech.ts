'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const CACHE_MAX = 50
const audioCache = new Map<string, string>()

function cacheAudio(text: string, url: string) {
  if (audioCache.size >= CACHE_MAX) {
    const oldest = audioCache.keys().next().value
    if (oldest) {
      URL.revokeObjectURL(audioCache.get(oldest)!)
      audioCache.delete(oldest)
    }
  }
  audioCache.set(text, url)
}

/**
 * Taiwan Mandarin TTS via edge-tts-universal (server) + HTMLAudioElement (client).
 * Works for full sentences and individual word chips.
 */
export function useSpeech() {
  const [supported] = useState(
    () => typeof window !== 'undefined' && typeof Audio !== 'undefined',
  )
  const [speakingKey, setSpeakingKey] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current = null
    }
    setSpeakingKey(null)
  }, [])

  const speak = useCallback(
    async (text: string, key?: string) => {
      const trimmed = text.trim()
      if (!trimmed || !supported) return

      stop()
      const id = key ?? trimmed
      setSpeakingKey(id)

      try {
        let url = audioCache.get(trimmed)
        if (!url) {
          const controller = new AbortController()
          abortRef.current = controller

          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: trimmed }),
            signal: controller.signal,
          })

          if (!res.ok) throw new Error(`TTS failed (${res.status})`)

          const blob = await res.blob()
          url = URL.createObjectURL(blob)
          cacheAudio(trimmed, url)
        }

        abortRef.current = null

        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => setSpeakingKey((k) => (k === id ? null : k))
        audio.onerror = () => setSpeakingKey((k) => (k === id ? null : k))
        await audio.play()
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setSpeakingKey(null)
        }
      }
    },
    [supported, stop],
  )

  useEffect(() => () => stop(), [stop])

  return { supported, speak, speakingKey }
}
