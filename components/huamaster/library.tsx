'use client'

import { useState } from 'react'
import { BookText, Type } from 'lucide-react'
import type {
  NotebookEntry,
  ReviewStatus,
  SentenceEntry,
} from '@/lib/huamaster-data'
import { Notebook } from './notebook'
import { SavedSentences } from './saved-sentences'
import { cn } from '@/lib/utils'

type LibraryTab = 'sentences' | 'vocabulary'

type LibraryProps = {
  sentences: SentenceEntry[]
  words: NotebookEntry[]
  wordsLoading?: boolean
  wordsError?: string | null
  onRemoveSentence: (id: string) => void
  onSetWordStatus: (id: string, status: ReviewStatus) => void | Promise<void>
  onRemoveWord: (id: string) => void | Promise<void>
  onSpeak: (text: string, key: string) => void
  speakingKey: string | null
  audioSupported: boolean
  showPinyin: boolean
  showBopomofo: boolean
}

export function Library({
  sentences,
  words,
  wordsLoading = false,
  wordsError = null,
  onRemoveSentence,
  onSetWordStatus,
  onRemoveWord,
  onSpeak,
  speakingKey,
  audioSupported,
  showPinyin,
  showBopomofo,
}: LibraryProps) {
  const [tab, setTab] = useState<LibraryTab>('sentences')

  return (
    <div className="flex flex-col gap-6">
      {/* Tab switcher */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1">
        <TabButton
          active={tab === 'sentences'}
          onClick={() => setTab('sentences')}
          icon={<BookText className="h-4 w-4" aria-hidden="true" />}
          label="保存した文章"
          count={sentences.length}
        />
        <TabButton
          active={tab === 'vocabulary'}
          onClick={() => setTab('vocabulary')}
          icon={<Type className="h-4 w-4" aria-hidden="true" />}
          label="保存した単語"
          count={words.length}
        />
      </div>

      {tab === 'sentences' ? (
        <SavedSentences
          entries={sentences}
          onRemove={onRemoveSentence}
          onSpeak={onSpeak}
          speakingKey={speakingKey}
          audioSupported={audioSupported}
          showPinyin={showPinyin}
        />
      ) : (
        <Notebook
          entries={words}
          loading={wordsLoading}
          error={wordsError}
          onSetStatus={onSetWordStatus}
          onRemove={onRemoveWord}
          onSpeak={onSpeak}
          speakingKey={speakingKey}
          audioSupported={audioSupported}
          showPinyin={showPinyin}
          showBopomofo={showBopomofo}
        />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
      <span
        className={cn(
          'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[0.65rem] font-bold',
          active
            ? 'bg-primary-foreground/20 text-primary-foreground'
            : 'bg-muted-foreground/15 text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  )
}
