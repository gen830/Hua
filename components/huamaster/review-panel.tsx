'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Layers,
  Loader2,
  LogIn,
  RotateCcw,
  X,
} from 'lucide-react'
import type { NotebookEntry } from '@/lib/huamaster-data'
import { isDue, type SrsGrade } from '@/lib/srs'
import { SpeakerButton } from './speaker-button'
import { cn } from '@/lib/utils'

type ReviewPanelProps = {
  words: NotebookEntry[]
  loading?: boolean
  error?: string | null
  onReview: (id: string, grade: SrsGrade) => void | Promise<void>
  onSpeak: (text: string, key: string) => void
  speakingKey: string | null
  audioSupported: boolean
  onSignIn?: () => void
  signedIn: boolean
}

export function ReviewPanel({
  words,
  loading = false,
  error = null,
  onReview,
  onSpeak,
  speakingKey,
  audioSupported,
  onSignIn,
  signedIn,
}: ReviewPanelProps) {
  const dueWords = useMemo(
    () =>
      words
        .filter((w) => isDue(w))
        .sort((a, b) => a.dueAt - b.dueAt),
    [words],
  )

  const [queue, setQueue] = useState<NotebookEntry[]>([])
  const [sessionStarted, setSessionStarted] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [doneCount, setDoneCount] = useState(0)

  // Sync queue when starting or when due list refreshes mid-session carefully.
  useEffect(() => {
    if (!sessionStarted) return
    setQueue((prev) => {
      if (prev.length === 0) return prev
      const ids = new Set(dueWords.map((w) => w.id))
      // Drop cards no longer due; keep order of remaining queue.
      return prev.filter((w) => ids.has(w.id))
    })
  }, [dueWords, sessionStarted])

  const current = queue[0] ?? null
  const remaining = queue.length
  const totalInSession = doneCount + remaining

  const startSession = () => {
    setQueue(dueWords)
    setSessionStarted(true)
    setRevealed(false)
    setDoneCount(0)
  }

  const handleGrade = async (grade: SrsGrade) => {
    if (!current || busy) return
    setBusy(true)
    try {
      await onReview(current.id, grade)
      setDoneCount((n) => n + 1)
      setQueue((prev) => prev.slice(1))
      setRevealed(false)
    } finally {
      setBusy(false)
    }
  }

  if (!signedIn) {
    return (
      <EmptyState
        icon={<LogIn className="h-7 w-7" aria-hidden="true" />}
        title="ログインして復習を始める"
        body="保存した単語の間隔反復復習には Google ログインが必要です。"
        action={
          onSignIn ? (
            <button
              type="button"
              onClick={onSignIn}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Google でログイン
            </button>
          ) : null
        }
      />
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p className="mt-4 text-sm text-muted-foreground">復習キューを準備中…</p>
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </p>
    )
  }

  if (!sessionStarted) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-3xl border border-border bg-card px-6 py-8 shadow-sm sm:px-8">
          <p className="text-sm font-medium text-muted-foreground">今日の復習</p>
          <p className="mt-2 font-cjk text-5xl font-bold tracking-tight text-foreground">
            {dueWords.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            {dueWords.length === 0
              ? 'いま復習すべき単語はありません。翻訳画面で単語を保存すると、ここに現れます。'
              : '期限が来た単語を、漢字 → 読み・意味の順で確認します。翻訳 API は使いません。'}
          </p>
          <button
            type="button"
            disabled={dueWords.length === 0}
            onClick={startSession}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
            復習を始める
          </button>
        </div>
      </div>
    )
  }

  if (!current) {
    return (
      <EmptyState
        icon={<Check className="h-7 w-7" aria-hidden="true" />}
        title="今日の復習が終わりました"
        body={
          doneCount > 0
            ? `${doneCount} 語を復習しました。不正解のカードは約10分後に再出題されます。`
            : 'キューは空です。'
        }
        action={
          <button
            type="button"
            onClick={() => {
              setSessionStarted(false)
              setDoneCount(0)
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            戻る
          </button>
        }
      />
    )
  }

  const speakId = `review-${current.id}`

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>
          {doneCount + 1} / {Math.max(totalInSession, 1)}
        </span>
        <span>残り {remaining}</span>
      </div>

      <article className="flex min-h-[22rem] flex-col rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {revealed ? '答え' : '問題'}
          </p>
          <SpeakerButton
            text={current.hanzi}
            speakId={speakId}
            onSpeak={onSpeak}
            active={speakingKey === speakId}
            disabled={!audioSupported}
            size="sm"
            label={`${current.hanzi} を読み上げ`}
          />
        </div>

        <div className="mt-6 flex flex-1 flex-col items-center justify-center text-center">
          <p className="font-cjk text-5xl font-medium leading-tight text-foreground sm:text-6xl">
            {current.hanzi}
          </p>

          {revealed ? (
            <div className="mt-6 space-y-2">
              <p className="font-cjk text-base text-muted-foreground">
                {current.bopomofo}
              </p>
              <p className="text-lg font-medium text-primary">{current.pinyin}</p>
              <p className="text-base text-foreground">{current.jp}</p>
              {current.pos ? (
                <p className="text-xs text-muted-foreground">{current.pos}</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-8 text-sm text-muted-foreground">
              読みと意味を思い浮かべてから答えを表示
            </p>
          )}
        </div>
      </article>

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-border bg-card px-4 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          答えを表示
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleGrade('again')}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
            )}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            わからない
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleGrade('good')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            覚えた
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setSessionStarted(false)
          setQueue([])
          setRevealed(false)
        }}
        className="inline-flex items-center justify-center gap-1.5 self-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        セッションを終了
      </button>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        {icon}
      </span>
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
        {body}
      </p>
      {action}
    </div>
  )
}
