'use client'

// Demo authentication + Supabase-backed vocabulary and sentence storage.

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
  sentencesLoading: boolean
  sentencesError: string | null
  signIn: (account: DemoAccount) => void
  signOut: () => void
  // words (Supabase)
  isWordSaved: (hanzi: string) => boolean
  toggleWord: (word: Word) => Promise<void>
  removeWord: (id: string) => Promise<void>
  setWordStatus: (id: string, status: ReviewStatus) => Promise<void>
  refreshWords: () => Promise<void>
  // sentences (Supabase)
  isSentenceSaved: (source: string, translation: string) => boolean
  saveSentence: (analysis: Analysis) => Promise<void>
  removeSentence: (id: string) => Promise<void>
  refreshSentences: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_KEY = 'huamaster:user'
const sentencesKey = (email: string) => `huamaster:sentences:${email}`

function loadLocalSentences(email: string): SentenceEntry[] {
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

function clearLocalSentences(email: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(sentencesKey(email))
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
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
      console.error('[saved_words] fetch failed', err)
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

      const localEntries = loadLocalSentences(email)
      if (localEntries.length > 0) {
        const imported = await importLocalSentences(
          email,
          localEntries,
          entries,
        )
        if (imported > 0) {
          entries = await fetchSavedSentences(email)
        }
        clearLocalSentences(email)
      }

      setSentences(entries)
    } catch (err) {
      console.error('[saved_sentences] fetch failed', err)
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

  // Restore session on mount.
  useEffect(() => {
    async function restore() {
      try {
        const raw = window.localStorage.getItem(USER_KEY)
        if (raw) {
          const restored = JSON.parse(raw) as User
          setUser(restored)
          await loadUserData(restored.email)
        }
      } catch {
        // ignore corrupt storage
      }
      setReady(true)
    }
    void restore()
  }, [loadUserData])

  const signIn = useCallback(
    (account: DemoAccount) => {
      setUser(account)
      try {
        window.localStorage.setItem(USER_KEY, JSON.stringify(account))
      } catch {
        // ignore
      }
      void loadUserData(account.email)
    },
    [loadUserData],
  )

  const signOut = useCallback(() => {
    setUser(null)
    setWords([])
    setWordsError(null)
    setSentences([])
    setSentencesError(null)
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
      words,
      wordsLoading,
      wordsError,
      sentences,
      sentencesLoading,
      sentencesError,
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
      refreshSentences,
    }),
    [
      user,
      ready,
      words,
      wordsLoading,
      wordsError,
      sentences,
      sentencesLoading,
      sentencesError,
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
