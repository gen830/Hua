'use client'

// Demo authentication + Supabase-backed vocabulary storage.
// Sentences remain in localStorage; saved words use the saved_words table.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  Analysis,
  NotebookEntry,
  ReviewStatus,
  SentenceEntry,
  Word,
} from './huamaster-data'
import {
  deleteSavedWordByHanzi,
  deleteSavedWordById,
  fetchSavedWords,
  insertSavedWord,
  updateSavedWordStatus,
} from './saved-words'
import { formatSupabaseError } from './supabase-errors'
import { isSupabaseConfigured } from './supabaseClient'

export type DemoAccount = {
  name: string
  email: string
  /** tailwind gradient classes for the avatar */
  avatar: string
}

export type User = DemoAccount

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: '田中 美咲',
    email: 'misaki.tanaka@gmail.com',
    avatar: 'from-emerald-400 to-teal-500',
  },
  {
    name: 'Kenji Sato',
    email: 'kenji.sato@gmail.com',
    avatar: 'from-sky-400 to-indigo-500',
  },
]

type StoredSentences = {
  sentences: SentenceEntry[]
}

type AuthContextValue = {
  user: User | null
  ready: boolean
  words: NotebookEntry[]
  wordsLoading: boolean
  wordsError: string | null
  sentences: SentenceEntry[]
  signIn: (account: DemoAccount) => void
  signOut: () => void
  // words (Supabase)
  isWordSaved: (hanzi: string) => boolean
  toggleWord: (word: Word) => Promise<void>
  removeWord: (id: string) => Promise<void>
  setWordStatus: (id: string, status: ReviewStatus) => Promise<void>
  refreshWords: () => Promise<void>
  // sentences (localStorage)
  isSentenceSaved: (source: string, translation: string) => boolean
  saveSentence: (analysis: Analysis) => void
  removeSentence: (id: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_KEY = 'huamaster:user'
const sentencesKey = (email: string) => `huamaster:sentences:${email}`

function loadSentences(email: string): SentenceEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(sentencesKey(email))
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<StoredSentences>
    return parsed.sentences ?? []
  } catch {
    return []
  }
}

function saveSentences(email: string, sentences: SentenceEntry[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      sentencesKey(email),
      JSON.stringify({ sentences } satisfies StoredSentences),
    )
  } catch {
    // storage may be full/unavailable
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [words, setWords] = useState<NotebookEntry[]>([])
  const [wordsLoading, setWordsLoading] = useState(false)
  const [wordsError, setWordsError] = useState<string | null>(null)
  const [sentences, setSentences] = useState<SentenceEntry[]>([])

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
      console.error('[saved_words] fetch failed', err)
      setWords([])
      setWordsError(formatSupabaseError(err, '単語の取得'))
    } finally {
      setWordsLoading(false)
    }
  }, [])

  // Restore session on mount.
  useEffect(() => {
    async function restore() {
      try {
        const raw = window.localStorage.getItem(USER_KEY)
        if (raw) {
          const restored = JSON.parse(raw) as User
          setUser(restored)
          setSentences(loadSentences(restored.email))
          await loadWordsFromSupabase(restored.email)
        }
      } catch {
        // ignore corrupt storage
      }
      setReady(true)
    }
    void restore()
  }, [loadWordsFromSupabase])

  // Persist sentences whenever they change (only when signed in).
  useEffect(() => {
    if (!user) return
    saveSentences(user.email, sentences)
  }, [user, sentences])

  const signIn = useCallback(
    (account: DemoAccount) => {
      setUser(account)
      try {
        window.localStorage.setItem(USER_KEY, JSON.stringify(account))
      } catch {
        // ignore
      }
      setSentences(loadSentences(account.email))
      void loadWordsFromSupabase(account.email)
    },
    [loadWordsFromSupabase],
  )

  const signOut = useCallback(() => {
    setUser(null)
    setWords([])
    setWordsError(null)
    setSentences([])
    try {
      window.localStorage.removeItem(USER_KEY)
    } catch {
      // ignore
    }
  }, [])

  const refreshWords = useCallback(async () => {
    if (!user) return
    await loadWordsFromSupabase(user.email)
  }, [user, loadWordsFromSupabase])

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

  const saveSentence = useCallback((analysis: Analysis) => {
    setSentences((prev) => {
      const exists = prev.find(
        (s) =>
          s.source === analysis.source &&
          s.translation === analysis.translation,
      )
      if (exists) return prev.filter((s) => s.id !== exists.id)
      return [
        ...prev,
        {
          id: `s-${Date.now()}`,
          source: analysis.source,
          sourceLang: analysis.sourceLang,
          translation: analysis.translation,
          translationPinyin: analysis.translationPinyin,
          words: analysis.words,
          grammar: analysis.grammar,
          addedAt: Date.now(),
        },
      ]
    })
  }, [])

  const removeSentence = useCallback((id: string) => {
    setSentences((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      words,
      wordsLoading,
      wordsError,
      sentences,
      signIn,
      signOut,
      isWordSaved,
      toggleWord,
      removeWord,
      setWordStatus,
      refreshWords,
      isSentenceSaved,
      saveSentence,
      removeSentence,
    }),
    [
      user,
      ready,
      words,
      wordsLoading,
      wordsError,
      sentences,
      signIn,
      signOut,
      isWordSaved,
      toggleWord,
      removeWord,
      setWordStatus,
      refreshWords,
      isSentenceSaved,
      saveSentence,
      removeSentence,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
