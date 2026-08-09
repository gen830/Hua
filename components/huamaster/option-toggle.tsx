'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type OptionToggleProps = {
  label: string
  icon: LucideIcon
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function OptionToggle({
  label,
  icon: Icon,
  checked,
  onChange,
  disabled,
}: OptionToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40',
        checked
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:bg-muted',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
      <span
        className={cn(
          'relative ml-1 h-4 w-7 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-border',
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            'absolute top-0.5 h-3 w-3 rounded-full bg-card transition-transform',
            checked ? 'translate-x-3.5' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}
