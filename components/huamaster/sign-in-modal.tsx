'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { DEMO_ACCOUNTS, type DemoAccount } from '@/lib/auth-context'
import { GoogleGlyph } from './google-glyph'
import { cn } from '@/lib/utils'

type SignInModalProps = {
  open: boolean
  onClose: () => void
  onSelect: (account: DemoAccount) => void
  reason?: string
}

export function SignInModal({
  open,
  onClose,
  onSelect,
  reason,
}: SignInModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Google でログイン"
    >
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm animate-in fade-in zoom-in-95 slide-in-from-bottom-4 rounded-t-3xl border border-border bg-card p-6 shadow-2xl sm:rounded-3xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex flex-col items-center text-center">
          <GoogleGlyph className="h-8 w-8" />
          <h2 className="mt-3 text-lg font-semibold text-foreground">
            アカウントを選択
          </h2>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            {reason ?? 'HuaMaster に Google でログイン'}
          </p>
        </div>

        <ul className="mt-6 flex flex-col gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                onClick={() => onSelect(account)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-base font-bold text-white',
                    account.avatar,
                  )}
                  aria-hidden="true"
                >
                  {account.name.charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {account.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {account.email}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-center text-[0.7rem] leading-relaxed text-muted-foreground">
          これはデモ用のログインです。実際の Google
          認証は行われず、データはこのブラウザーにのみ保存されます。
        </p>
      </div>
    </div>
  )
}
