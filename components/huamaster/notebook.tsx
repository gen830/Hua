'use client'

import { useState } from 'react'
import { BookMarked, CircleCheck, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import type { NotebookEntry, ReviewStatus } from '@/lib/huamaster-data'
import { SpeakerButton } from './speaker-button'
import { cn } from '@/lib/utils'

type Filter = 'all' | ReviewStatus

type NotebookProps = {
  entries: NotebookEntry[]
  loading?: boolean
  error?: string | null
  onSetStatus: (id: string, status: ReviewStatus) => void | Promise<void>
  onRemove: (id: string) => void | Promise<void>
  onSpeak: (text: string, key: string) => void
  speakingKey: string | null
  audioSupported: boolean
  showPinyin: boolean
  showBopomofo: boolean
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'reviewing', label: '覚える' },
  { key: 'mastered', label: '覚えた' },
]

export function Notebook({
  entries,
  loading = false,
  error = null,
  onSetStatus,
  onRemove,
  onSpeak,
  speakingKey,
  audioSupported,
  showPinyin,
  showBopomofo,
}: NotebookProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const counts = {
    all: entries.length,
    reviewing: entries.filter((e) => e.status === 'reviewing').length,
    mastered: entries.filter((e) => e.status === 'mastered').length,
  }

  const visible = entries
    .filter((e) => filter === 'all' || e.status === filter)
    .sort((a, b) => b.addedAt - a.addedAt)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              filter === f.key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            {f.label}
            <span
              className={cn(
                'rounded-full px-1.5 text-xs',
                filter === f.key
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted-foreground">
            Supabase から単語を読み込み中…
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <BookMarked className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm font-medium text-foreground">
            {filter === 'all'
              ? '単語帳はまだ空です'
              : 'このカテゴリーに単語はありません'}
          </p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground text-pretty">
            「翻訳して分析」で単語をタップし、詳細画面から単語帳に保存できます。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((entry) => {
            const speakId = `nb-${entry.id}`
            const mastered = entry.status === 'mastered'
            return (
              <article
                key={entry.id}
                className={cn(
                  'group flex flex-col rounded-3xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md',
                  mastered ? 'border-primary/40' : 'border-border',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {showBopomofo && (
                      <p className="font-cjk text-xs text-muted-foreground">
                        {entry.bopomofo}
                      </p>
                    )}
                    <p className="font-cjk text-3xl font-medium leading-tight text-foreground">
                      {entry.hanzi}
                    </p>
                    {showPinyin && (
                      <p className="text-sm font-medium text-primary">
                        {entry.pinyin}
                      </p>
                    )}
                  </div>
                  <SpeakerButton
                    text={entry.hanzi}
                    speakId={speakId}
                    onSpeak={onSpeak}
                    active={speakingKey === speakId}
                    disabled={!audioSupported}
                    size="sm"
                  />
                </div>

                <p className="mt-3 flex-1 text-sm text-muted-foreground">
                  {entry.jp}
                </p>

                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() =>
                      void onSetStatus(
                        entry.id,
                        mastered ? 'reviewing' : 'mastered',
                      )
                    }
                    className={cn(
                      'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      mastered
                        ? 'bg-primary/10 text-primary hover:bg-primary/15'
                        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )}
                    aria-pressed={mastered}
                  >
                    {mastered ? (
                      <>
                        <CircleCheck className="h-4 w-4" aria-hidden="true" />
                        覚えた
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        覚える
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onRemove(entry.id)}
                    aria-label={`Remove ${entry.hanzi}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
