'use client'

import { useState } from 'react'
import { BookText, Loader2, ChevronDown, GraduationCap, Trash2 } from 'lucide-react'
import type { SentenceEntry } from '@/lib/huamaster-data'
import { SpeakerButton } from './speaker-button'
import { cn } from '@/lib/utils'

type SavedSentencesProps = {
  entries: SentenceEntry[]
  loading?: boolean
  error?: string | null
  onRemove: (id: string) => void | Promise<void>
  onSpeak: (text: string, key: string) => void
  speakingKey: string | null
  audioSupported: boolean
  showPinyin: boolean
}

export function SavedSentences({
  entries,
  loading = false,
  error = null,
  onRemove,
  onSpeak,
  speakingKey,
  audioSupported,
  showPinyin,
}: SavedSentencesProps) {
  const sorted = [...entries].sort((a, b) => b.addedAt - a.addedAt)

  if (error) {
    return (
      <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
        {error}
      </p>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p className="mt-4 text-sm text-muted-foreground">
          Supabase から文章を読み込み中…
        </p>
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <BookText className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="mt-4 text-sm font-medium text-foreground">
          保存した文章はまだありません
        </p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground text-pretty">
          「翻訳・分析」で文を分析し、「文章・文法解説を保存」を押すとここに追加されます。
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {sorted.map((entry) => (
        <SentenceCard
          key={entry.id}
          entry={entry}
          onRemove={onRemove}
          onSpeak={onSpeak}
          speakingKey={speakingKey}
          audioSupported={audioSupported}
          showPinyin={showPinyin}
        />
      ))}
    </div>
  )
}

function SentenceCard({
  entry,
  onRemove,
  onSpeak,
  speakingKey,
  audioSupported,
  showPinyin,
}: {
  entry: SentenceEntry
  onRemove: (id: string) => void | Promise<void>
  onSpeak: (text: string, key: string) => void
  speakingKey: string | null
  audioSupported: boolean
  showPinyin: boolean
}) {
  const [open, setOpen] = useState(false)
  const speakId = `sent-${entry.id}`

  return (
    <article className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted-foreground">{entry.source}</p>
        <button
          type="button"
          onClick={() => void onRemove(entry.id)}
          aria-label={`削除：${entry.translation}`}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-cjk text-2xl font-medium leading-snug text-foreground text-balance sm:text-3xl">
            {entry.translation}
          </p>
          {showPinyin && (
            <p className="mt-1.5 text-sm font-medium text-primary">
              {entry.translationPinyin}
            </p>
          )}
        </div>
        <SpeakerButton
          text={entry.translation}
          speakId={speakId}
          onSpeak={onSpeak}
          active={speakingKey === speakId}
          disabled={!audioSupported}
        />
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-4 flex w-full items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="flex-1">文法の解説（{entry.grammar.length}）</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      <div
        className={cn(
          'grid transition-all duration-200',
          open ? 'mt-2 grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <ul className="flex flex-col gap-2">
            {entry.grammar.map((note, i) => (
              <li
                key={note.title}
                className="rounded-2xl border border-border bg-background p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[0.7rem] font-bold text-primary">
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    {note.title}
                  </p>
                </div>
                <p className="mt-1.5 pl-7 text-sm leading-relaxed text-muted-foreground">
                  {note.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  )
}
