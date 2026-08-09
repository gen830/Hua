'use client'

import type { Word } from '@/lib/huamaster-data'
import { cn } from '@/lib/utils'

type WordChipProps = {
  word: Word
  index: number
  showPinyin: boolean
  showBopomofo: boolean
  saved: boolean
  onClick: () => void
}

export function WordChip({
  word,
  index,
  showPinyin,
  showBopomofo,
  saved,
  onClick,
}: WordChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${index * 60}ms` }}
      className={cn(
        'group animate-in fade-in slide-in-from-bottom-2 fill-mode-both',
        'relative flex flex-col items-center gap-1 rounded-2xl border bg-card px-4 py-3 text-center shadow-sm transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        saved ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border',
      )}
      aria-label={`${word.hanzi} — ${word.jp}. View details`}
    >
      {saved && (
        <span
          className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-primary ring-2 ring-card"
          aria-hidden="true"
        />
      )}
      {showBopomofo && (
        <span className="font-cjk text-[0.65rem] leading-tight text-muted-foreground">
          {word.bopomofo}
        </span>
      )}
      <span className="font-cjk text-2xl font-medium leading-none text-foreground">
        {word.hanzi}
      </span>
      {showPinyin && (
        <span className="text-xs font-medium text-primary">{word.pinyin}</span>
      )}
      <span className="max-w-[9rem] truncate text-[0.7rem] text-muted-foreground">
        {word.jp}
      </span>
    </button>
  )
}
