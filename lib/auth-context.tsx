'use client'

// Supabase Auth (Google) + cloud-backed vocabulary and sentence storage.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { mapSupabaseUser, type User } from './auth-user'
import type {
  Analysis,
  NotebookEntry,
  ReviewStatus,
  SentenceEntry,
  Word,
} from './huamaster-data'
import {
  deleteSavedSentenceById,
  fetchSavedSentences,
  importLocalSentences,
  insertSavedSentence,
} from './saved-sentences'
import {
  deleteSavedWordByHanzi,
  deleteSavedWordById,
  fetchSavedWords,
  insertSavedWord,
  updateSavedWordStatus,
} from './saved-words'
import { formatSupabaseError } from './supabase-errors'
import {
  getAuthCallbackUrl,
  getSupabaseClient,
  isSupabaseConfigured,
} from './supabaseClient'

export type { User }

type AuthContextValue = {
  user: User | null
  ready: boolean
  authLoading: boolean
  words: NotebookEntry[]
  wordsLoading: boolean
  wordsError: string | null
  sentences: SentenceEntry[]
  sentencesLoading: boolean
  sentencesError: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  isWordSaved: (hanzi: string) => boolean
  toggleWord: (word: Word) => Promise<void>
  removeWord: (id: string) => Promise<void>
  setWordStatus: (id: string, status: ReviewStatus) => Promise<void>
  refreshWords: () => Promise<void>
  isSentenceSaved: (source: string, translation: string) => boolean
  saveSentence: (analysis: Analysis) => Promise<void>
  removeSentence: (id: string) => Promise<void>
  refreshSentences: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

type StoredSentences = {
  sentences: SentenceEntry[]
}

/** Legacy demo localStorage key pattern (pre-Google Auth). */
function legacySentencesKey(email: string): string {
  return `huamaster:sentences:${email}`
}

function loadLegacySentences(email: string): SentenceEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(legacySentencesKey(email))
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<StoredSentences>
    return parsed.sentences ?? []
  } catch {
    return []
  }
}

function clearLegacySentences(email: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(legacySentencesKey(email))
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [words, setWords] = useState<NotebookEntry[]>([])
  const [wordsLoading, setWordsLoading] = useState(false)
  const [wordsError, setWordsError] = useState<string | null>(null)
  const [sentences, setSentences] = useState<SentenceEntry[]>([])
  const [sentencesLoading, setSentencesLoading] = useState(false)
  const [sentencesError, setSentencesError] = useState<string | null>(null)

  const loadWordsFromSupabase = useCallback(async (email: string) => {
    if (!isSupabaseConfigured()) {
      setWords([])
      setWordsError(
        'Supabase が未設定です。.env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を追加してください。',
      )
      return
    }

    setWordsLoading(true)
    setWordsError(null)
    try {
      const entries = await fetchSavedWords(email)
      setWords(entries)
    } catch (err) {
      const detail =
        err && typeof err === 'object'
          ? {
              code: (err as { code?: string }).code,
              message: (err as { message?: string }).message,
            }
          : err
      console.error('[saved_words] fetch failed', detail)
      setWords([])
      setWordsError(formatSupabaseError(err, '単語の取得'))
    } finally {
      setWordsLoading(false)
    }
  }, [])

  const loadSentencesFromSupabase = useCallback(async (email: string) => {
    if (!isSupabaseConfigured()) {
      setSentences([])
      setSentencesError(
        'Supabase が未設定です。.env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を追加してください。',
      )
      return
    }

    setSentencesLoading(true)
    setSentencesError(null)
    try {
      let entries = await fetchSavedSentences(email)

      const localEntries = loadLegacySentences(email)
      if (localEntries.length > 0) {
        const imported = await importLocalSentences(
          email,
          localEntries,
          entries,
        )
        if (imported > 0) {
          entries = await fetchSavedSentences(email)
        }
        clearLegacySentences(email)
      }

      setSentences(entries)
    } catch (err) {
      const detail =
        err && typeof err === 'object'
          ? {
              code: (err as { code?: string }).code,
              message: (err as { message?: string }).message,
            }
          : err
      console.error('[saved_sentences] fetch failed', detail)
      setSentences([])
      setSentencesError(formatSupabaseError(err, '文章の取得'))
    } finally {
      setSentencesLoading(false)
    }
  }, [])

  const loadUserData = useCallback(
    async (email: string) => {
      await Promise.all([
        loadWordsFromSupabase(email),
        loadSentencesFromSupabase(email),
      ])
    },
    [loadWordsFromSupabase, loadSentencesFromSupabase],
  )

  const clearUserData = useCallback(() => {
    setWords([])
    setWordsError(null)
    setSentences([])
    setSentencesError(null)
  }, [])

  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      setReady(true)
      return
    }

    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session?.user) {
        const mapped = mapSupabaseUser(session.user)
        setUser(mapped)
        queueMicrotask(() => {
          if (mounted) void loadUserData(mapped.email)
        })
      }
      setReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      if (session?.user) {
        const mapped = mapSupabaseUser(session.user)
        setUser(mapped)
        // Defer Supabase Data API calls to avoid auth callback deadlocks.
        queueMicrotask(() => {
          if (mounted) void loadUserData(mapped.email)
        })
      } else {
        setUser(null)
        clearUserData()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [clearUserData, loadUserData])

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase が未設定です。')
    }

    const redirectTo = getAuthCallbackUrl()
    if (!redirectTo) {
      throw new Error('リダイレクト URL を決定できません。')
    }

    setAuthLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })
      if (error) throw error
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient()
    if (!supabase) return

    setAuthLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      clearUserData()
    } catch (err) {
      console.error('[auth] signOut failed', err)
    } finally {
      setAuthLoading(false)
    }
  }, [clearUserData])

  const refreshWords = useCallback(async () => {
    if (!user) return
    await loadWordsFromSupabase(user.email)
  }, [user, loadWordsFromSupabase])

  const refreshSentences = useCallback(async () => {
    if (!user) return
    await loadSentencesFromSupabase(user.email)
  }, [user, loadSentencesFromSupabase])

  const isWordSaved = useCallback(
    (hanzi: string) => words.some((w) => w.hanzi === hanzi),
    [words],
  )

  const toggleWord = useCallback(
    async (word: Word) => {
      if (!user) return

      const exists = words.find((w) => w.hanzi === word.hanzi)
      if (exists) {
        const previous = words
        setWords((prev) => prev.filter((w) => w.hanzi !== word.hanzi))
        try {
          await deleteSavedWordByHanzi(user.email, word.hanzi)
          setWordsError(null)
        } catch (err) {
          console.error('[saved_words] delete failed', err)
          setWords(previous)
          setWordsError(formatSupabaseError(err, '単語の削除'))
        }
        return
      }

      try {
        const entry = await insertSavedWord(user.email, word)
        setWords((prev) => [entry, ...prev.filter((w) => w.hanzi !== word.hanzi)])
        setWordsError(null)
      } catch (err) {
        console.error('[saved_words] insert failed', err)
        setWordsError(formatSupabaseError(err, '単語の保存'))
      }
    },
    [user, words],
  )

  const removeWord = useCallback(
    async (id: string) => {
      if (!user) return
      const previous = words
      setWords((prev) => prev.filter((w) => w.id !== id))
      try {
        await deleteSavedWordById(user.email, id)
        setWordsError(null)
      } catch (err) {
        console.error('[saved_words] delete failed', err)
        setWords(previous)
        setWordsError(formatSupabaseError(err, '単語の削除'))
      }
    },
    [user, words],
  )

  const setWordStatus = useCallback(
    async (id: string, status: ReviewStatus) => {
      if (!user) return
      const previous = words
      setWords((prev) => prev.map((w) => (w.id === id ? { ...w, status } : w)))
      try {
        await updateSavedWordStatus(user.email, id, status)
        setWordsError(null)
      } catch (err) {
        console.error('[saved_words] update failed', err)
        setWords(previous)
        setWordsError(formatSupabaseError(err, '学習ステータスの更新'))
      }
    },
    [user, words],
  )

  const isSentenceSaved = useCallback(
    (source: string, translation: string) =>
      sentences.some(
        (s) => s.source === source && s.translation === translation,
      ),
    [sentences],
  )

  const saveSentence = useCallback(
    async (analysis: Analysis) => {
      if (!user) return

      const exists = sentences.find(
        (s) =>
          s.source === analysis.source &&
          s.translation === analysis.translation,
      )

      if (exists) {
        const previous = sentences
        setSentences((prev) => prev.filter((s) => s.id !== exists.id))
        try {
          await deleteSavedSentenceById(user.email, exists.id)
          setSentencesError(null)
        } catch (err) {
          console.error('[saved_sentences] delete failed', err)
          setSentences(previous)
          setSentencesError(formatSupabaseError(err, '文章の削除'))
        }
        return
      }

      try {
        const entry = await insertSavedSentence(user.email, analysis)
        setSentences((prev) => [
          entry,
          ...prev.filter(
            (s) =>
              !(
                s.source === analysis.source &&
                s.translation === analysis.translation
              ),
          ),
        ])
        setSentencesError(null)
      } catch (err) {
        console.error('[saved_sentences] insert failed', err)
        setSentencesError(formatSupabaseError(err, '文章の保存'))
      }
    },
    [user, sentences],
  )

  const removeSentence = useCallback(
    async (id: string) => {
      if (!user) return
      const previous = sentences
      setSentences((prev) => prev.filter((s) => s.id !== id))
      try {
        await deleteSavedSentenceById(user.email, id)
        setSentencesError(null)
      } catch (err) {
        console.error('[saved_sentences] delete failed', err)
        setSentences(previous)
        setSentencesError(formatSupabaseError(err, '文章の削除'))
      }
    },
    [user, sentences],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      authLoading,
      words,
      wordsLoading,
      wordsError,
      sentences,
      sentencesLoading,
      sentencesError,
      signInWithGoogle,
      signOut,
      isWordSaved,
      toggleWord,
      removeWord,
      setWordStatus,
      refreshWords,
      isSentenceSaved,
      saveSentence,
      removeSentence,
      refreshSentences,
    }),
    [
      user,
      ready,
      authLoading,
      words,
      wordsLoading,
      wordsError,
      sentences,
      sentencesLoading,
      sentencesError,
      signInWithGoogle,
      signOut,
      isWordSaved,
      toggleWord,
      removeWord,
      setWordStatus,
      refreshWords,
      isSentenceSaved,
      saveSentence,
      removeSentence,
      refreshSentences,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
