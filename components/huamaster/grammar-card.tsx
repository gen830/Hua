'use client'

import { useState } from 'react'
import { ChevronDown, GraduationCap } from 'lucide-react'
import type { GrammarNote } from '@/lib/huamaster-data'
import { cn } from '@/lib/utils'

export function GrammarCard({ notes }: { notes: GrammarNote[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-foreground">文法の解説</h3>
          <p className="text-xs text-muted-foreground">Grammar breakdown</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {notes.map((note, i) => {
          const isOpen = open === i
          return (
            <div
              key={note.title}
              className="overflow-hidden rounded-2xl border border-border bg-background"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-medium text-foreground">
                  {note.title}
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>
              <div
                className={cn(
                  'grid transition-all duration-200',
                  isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-4 pb-4 pl-12 text-sm leading-relaxed text-muted-foreground">
                    {note.detail}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
