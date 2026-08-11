'use client'

import { BookOpen, Languages, Settings } from 'lucide-react'
import type { User } from '@/lib/auth-context'
import { GoogleGlyph } from './google-glyph'
import { UserMenu } from './user-menu'
import { cn } from '@/lib/utils'

export type View = 'translate' | 'library' | 'settings'

type HeaderProps = {
  view: View
  setView: (v: View) => void
  savedCount: number
  user: User | null
  onSignInClick: () => void
  onSignOut: () => void
}

export function Header({
  view,
  setView,
  savedCount,
  user,
  onSignInClick,
  onSignOut,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Logo */}
        <button
          type="button"
          onClick={() => setView('translate')}
          className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="HuaMaster home"
        >
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <span className="font-cjk text-lg font-bold leading-none">華</span>
          </span>
          <span className="hidden flex-col items-start leading-none sm:flex">
            <span className="text-base font-bold tracking-tight text-foreground">
              HuaMaster
            </span>
            <span className="text-[0.65rem] font-medium text-muted-foreground">
              台湾華語アシスタント
            </span>
          </span>
        </button>

        {/* Nav */}
        <nav className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <NavButton
            active={view === 'translate'}
            onClick={() => setView('translate')}
            icon={<Languages className="h-4 w-4" aria-hidden="true" />}
            label="翻訳・分析"
          />
          <NavButton
            active={view === 'library'}
            onClick={() => setView('library')}
            icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}
            label="保存"
            badge={savedCount}
          />
          <NavButton
            active={view === 'settings'}
            onClick={() => setView('settings')}
            icon={<Settings className="h-4 w-4" aria-hidden="true" />}
            label="設定"
          />
        </nav>

        {/* Auth */}
        {user ? (
          <UserMenu user={user} onSignOut={onSignOut} />
        ) : (
          <button
            type="button"
            onClick={onSignInClick}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          >
            <GoogleGlyph className="h-4 w-4" />
            <span className="hidden sm:inline">Google でログイン</span>
            <span className="sm:hidden">ログイン</span>
          </button>
        )}
      </div>
    </header>
  )
}

function NavButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  badge?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[0.65rem] font-bold',
            active
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-primary/15 text-primary',
          )}
        >
          {badge}
        </span>
      )}
    </button>
  )
}
