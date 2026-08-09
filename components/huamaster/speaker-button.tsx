'use client'

import { Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type SpeakerButtonProps = {
  text: string
  speakId: string
  onSpeak: (text: string, key: string) => void
  active?: boolean
  disabled?: boolean
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

export function SpeakerButton({
  text,
  speakId,
  onSpeak,
  active = false,
  disabled = false,
  label = 'Play pronunciation',
  size = 'md',
  className,
}: SpeakerButtonProps) {
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <button
      type="button"
      onClick={() => onSpeak(text, speakId)}
      disabled={disabled}
      aria-label={label}
      title={disabled ? '音声を利用できません' : label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40',
        dim,
        active && 'animate-pulse bg-primary text-primary-foreground',
        className,
      )}
    >
      <Volume2 className={icon} aria-hidden="true" />
    </button>
  )
}
