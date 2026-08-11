'use client'

import { useCallback, useEffect, useState } from 'react'
import { LogIn } from 'lucide-react'
import { Header, type View } from '@/components/huamaster/header'
import { Translator } from '@/components/huamaster/translator'
import { Library } from '@/components/huamaster/library'
import { SettingsPanel } from '@/components/huamaster/settings-panel'
import { WordDetailModal } from '@/components/huamaster/word-detail-modal'
import { SignInModal } from '@/components/huamaster/sign-in-modal'
import { GoogleGlyph } from '@/components/huamaster/google-glyph'
import { useSpeech } from '@/lib/use-speech'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { SettingsProvider, useSettings } from '@/lib/settings-context'
import type { Analysis, Word } from '@/lib/huamaster-data'

export default function Page() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <HuaMaster />
      </SettingsProvider>
    </AuthProvider>
  )
}

function HuaMaster() {
  const {
    user,
    words,
    wordsLoading,
    wordsError,
    sentences,
    sentencesLoading,
    sentencesError,
    signInWithGoogle,
    signOut,
    authLoading,
    isWordSaved,
    toggleWord,
    removeWord,
    setWordStatus,
    isSentenceSaved,
    saveSentence,
    removeSentence,
  } = useAuth()

  const [view, setView] = useState<View>('translate')
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)
  const [signInOpen, setSignInOpen] = useState(false)
  const [signInReason, setSignInReason] = useState<string | undefined>(undefined)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const message = params.get('auth_error')
    if (!message) return
    setAuthError(message)
    setSignInOpen(true)
    params.delete('auth_error')
    const next = params.toString()
    const url = next ? `${window.location.pathname}?${next}` : window.location.pathname
    window.history.replaceState({}, '', url)
  }, [])

  const { speechRate } = useSettings()
  const { supported: audioSupported, speak, speakingKey } = useSpeech(speechRate)

  const handleSpeak = useCallback(
    (text: string, key: string) => {
      speak(text, key)
    },
    [speak],
  )

  const openSignIn = useCallback((reason?: string) => {
    setSignInReason(reason)
    setSignInOpen(true)
  }, [])

  const handleSignInWithGoogle = useCallback(async () => {
    await signInWithGoogle()
  }, [signInWithGoogle])

  const handleNavigate = useCallback(
    (v: View) => {
      if (v === 'library' && !user) {
        openSignIn('保存ライブラリを見るにはログインしてください')
        return
      }
      setView(v)
    },
    [user, openSignIn],
  )

  // Word saving — requires sign-in.
  const isSaved = useCallback((word: Word) => isWordSaved(word.hanzi), [
    isWordSaved,
  ])

  const handleToggleWord = useCallback(
    (word: Word) => {
      if (!user) {
        openSignIn('単語を保存するにはログインしてください')
        return
      }
      void toggleWord(word)
    },
    [user, toggleWord, openSignIn],
  )

  const handleSaveSentence = useCallback(
    (analysis: Analysis) => {
      if (!user) {
        openSignIn('文章・文法解説を保存するにはログインしてください')
        return
      }
      void saveSentence(analysis)
    },
    [user, saveSentence, openSignIn],
  )

  return (
    <div className="min-h-dvh bg-background">
      <Header
        view={view}
        setView={handleNavigate}
        savedCount={words.length + sentences.length}
        user={user}
        onSignInClick={() => openSignIn()}
        onSignOut={signOut}
      />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {authError && (
          <p className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {authError}
          </p>
        )}
        {view === 'translate' ? (
          <>
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl">
                日本語を台湾華語に翻訳・分析
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                文を入力すると、繁体字の訳・ピンイン・注音・文法の解説・単語カードが表示されます。
              </p>
            </div>
            <Translator
              onWordClick={setSelectedWord}
              isSaved={isSaved}
              onSpeak={handleSpeak}
              speakingKey={speakingKey}
              audioSupported={audioSupported}
              onSaveSentence={handleSaveSentence}
              isSentenceSaved={isSentenceSaved}
            />
          </>
        ) : view === 'library' ? (
          <>
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl">
                私の保存ライブラリ
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                保存した文章・文法解説と単語をまとめて復習できます。
              </p>
            </div>
            {user ? (
              <Library
                sentences={sentences}
                words={words}
                wordsLoading={wordsLoading}
                wordsError={wordsError}
                sentencesLoading={sentencesLoading}
                sentencesError={sentencesError}
                onRemoveSentence={removeSentence}
                onSetWordStatus={setWordStatus}
                onRemoveWord={removeWord}
                onSpeak={handleSpeak}
                speakingKey={speakingKey}
                audioSupported={audioSupported}
                showPinyin
                showBopomofo
              />
            ) : (
              <SignInPrompt onSignIn={() => openSignIn()} />
            )}
          </>
        ) : (
          <>
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl">
                設定
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                読み上げ速度など、アプリの表示・操作を調整できます。
              </p>
            </div>
            <SettingsPanel
              onSpeakPreview={handleSpeak}
              speakingKey={speakingKey}
              audioSupported={audioSupported}
            />
          </>
        )}
      </main>

      <WordDetailModal
        word={selectedWord}
        saved={selectedWord ? isSaved(selectedWord) : false}
        onClose={() => setSelectedWord(null)}
        onToggleSave={handleToggleWord}
        onSpeak={handleSpeak}
        speakingKey={speakingKey}
        audioSupported={audioSupported}
      />

      <SignInModal
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSignIn={handleSignInWithGoogle}
        loading={authLoading}
        reason={signInReason}
      />

      <footer className="mx-auto max-w-5xl px-4 pb-10 pt-4 text-center sm:px-6">
        <p className="text-xs text-muted-foreground">
          HuaMaster · 台湾華語（繁體中文）学習アシスタント
        </p>
      </footer>
    </div>
  )
}

function SignInPrompt({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <LogIn className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="mt-4 text-base font-semibold text-foreground">
        ログインして学習を保存
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
        Google でログインすると、保存した単語と文章・文法解説は Supabase に保存され、端末を替えても復習できます。
      </p>
      <button
        type="button"
        onClick={onSignIn}
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <GoogleGlyph className="h-4 w-4" />
        Google でログイン
      </button>
    </div>
  )
}
