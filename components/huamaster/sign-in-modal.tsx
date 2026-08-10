'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { GoogleGlyph } from './google-glyph'

type SignInModalProps = {
  open: boolean
  onClose: () => void
  onSignIn: () => Promise<void>
  loading?: boolean
  reason?: string
}

export function SignInModal({
  open,
  onClose,
  onSignIn,
  loading = false,
  reason,
}: SignInModalProps) {
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    if (open) setError(null)
  }, [open])

  if (!open) return null

  async function handleSignIn() {
    setError(null)
    try {
      await onSignIn()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'ログインに失敗しました。もう一度お試しください。',
      )
    }
  }

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
            Google でログイン
          </h2>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            {reason ?? '保存した単語・文章をどのデバイスからでも復習できます。'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleSignIn()}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-background px-4 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <GoogleGlyph className="h-5 w-5" />
          )}
          {loading ? 'Google へ移動中…' : 'Google アカウントで続行'}
        </button>

        {error && (
          <p className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
            {error}
          </p>
        )}

        <p className="mt-5 text-center text-[0.7rem] leading-relaxed text-muted-foreground">
          ログイン後、単語と文章は Supabase に保存され、同じ Google
          アカウントならスマホ・PC どちらからでも見られます。
        </p>
      </div>
    </div>
  )
}
