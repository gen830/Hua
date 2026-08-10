'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type OptionToggleProps = {
  label: string
  icon: LucideIcon
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function OptionToggle({
  label,
  icon: Icon,
  checked,
  onChange,
  disabled,
  className,
}: OptionToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex h-9 w-full items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40',
        checked
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:bg-muted',
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      <span
        className={cn(
          'inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors',
          checked ? 'bg-primary' : 'bg-border',
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            'size-4 rounded-full bg-card shadow-sm transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </span>
    </button>
  )
}
