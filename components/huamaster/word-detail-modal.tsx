'use client'

import { useEffect } from 'react'
import { Bookmark, BookmarkCheck, X } from 'lucide-react'
import type { Word } from '@/lib/huamaster-data'
import { SpeakerButton } from './speaker-button'
import { cn } from '@/lib/utils'

type WordDetailModalProps = {
  word: Word | null
  saved: boolean
  onClose: () => void
  onToggleSave: (word: Word) => void
  onSpeak: (text: string, key: string) => void
  speakingKey: string | null
  audioSupported: boolean
}

export function WordDetailModal({
  word,
  saved,
  onClose,
  onToggleSave,
  onSpeak,
  speakingKey,
  audioSupported,
}: WordDetailModalProps) {
  useEffect(() => {
    if (!word) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [word, onClose])

  if (!word) return null

  const speakId = `modal-${word.hanzi}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${word.hanzi}`}
    >
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 slide-in-from-bottom-4 rounded-t-3xl border border-border bg-card p-6 shadow-2xl sm:rounded-3xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          {word.pos}
        </span>

        <div className="mt-4 flex flex-col items-center text-center">
          <p className="font-cjk text-6xl font-medium leading-none text-foreground">
            {word.hanzi}
          </p>

          <div className="mt-4 flex items-center gap-3">
            <div className="text-left">
              <p className="text-lg font-semibold text-primary">{word.pinyin}</p>
              <p className="font-cjk text-sm text-muted-foreground">
                {word.bopomofo}
              </p>
            </div>
            <SpeakerButton
              text={word.hanzi}
              speakId={speakId}
              onSpeak={onSpeak}
              active={speakingKey === speakId}
              disabled={!audioSupported}
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-muted/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            日本語の意味
          </p>
          <p className="mt-1 text-base font-medium text-foreground">{word.jp}</p>
        </div>

        <button
          type="button"
          onClick={() => onToggleSave(word)}
          className={cn(
            'mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            saved
              ? 'border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          {saved ? (
            <>
              <BookmarkCheck className="h-5 w-5" aria-hidden="true" />
              単語帳に保存済み（タップで削除）
            </>
          ) : (
            <>
              <Bookmark className="h-5 w-5" aria-hidden="true" />
              単語帳に保存する
            </>
          )}
        </button>
      </div>
    </div>
  )
}
