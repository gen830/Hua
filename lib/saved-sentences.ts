import type { Analysis, GrammarNote, SentenceEntry, Word } from './huamaster-data'
import {
  getAuthenticatedSupabase,
  withSupabaseDataRetry,
} from './supabase-data'

export type SavedSentenceRow = {
  id: string
  user_email: string
  source: string
  source_lang: string
  translation: string
  translation_pinyin: string
  words: Word[]
  grammar: GrammarNote[]
  added_at: string
}

function rowToEntry(row: SavedSentenceRow): SentenceEntry {
  return {
    id: row.id,
    source: row.source,
    sourceLang: row.source_lang,
    translation: row.translation,
    translationPinyin: row.translation_pinyin,
    sourcePinyin: '',
    words: row.words ?? [],
    grammar: row.grammar ?? [],
    addedAt: new Date(row.added_at).getTime(),
  }
}

function sentenceKey(source: string, translation: string): string {
  return `${source}\0${translation}`
}

export async function fetchSavedSentences(
  userEmail: string,
): Promise<SentenceEntry[]> {
  return withSupabaseDataRetry(async () => {
    const supabase = await getAuthenticatedSupabase()

    const { data, error } = await supabase
      .from('saved_sentences')
      .select('*')
      .eq('user_email', userEmail)
      .order('added_at', { ascending: false })

    if (error) throw error
    return (data as SavedSentenceRow[]).map(rowToEntry)
  })
}

export async function insertSavedSentence(
  userEmail: string,
  analysis: Analysis,
): Promise<SentenceEntry> {
  return withSupabaseDataRetry(async () => {
    const supabase = await getAuthenticatedSupabase()

    const { data, error } = await supabase
      .from('saved_sentences')
      .insert({
        user_email: userEmail,
        source: analysis.source,
        source_lang: analysis.sourceLang,
        translation: analysis.translation,
        translation_pinyin: analysis.translationPinyin,
        words: analysis.words,
        grammar: analysis.grammar,
      })
      .select('*')
      .single()

    if (error) throw error
    return rowToEntry(data as SavedSentenceRow)
  })
}

export async function deleteSavedSentenceById(
  userEmail: string,
  id: string,
): Promise<void> {
  await withSupabaseDataRetry(async () => {
    const supabase = await getAuthenticatedSupabase()

    const { error } = await supabase
      .from('saved_sentences')
      .delete()
      .eq('user_email', userEmail)
      .eq('id', id)

    if (error) throw error
  })
}

/** Import localStorage sentences that are not already in Supabase. */
export async function importLocalSentences(
  userEmail: string,
  localEntries: SentenceEntry[],
  remoteEntries: SentenceEntry[],
): Promise<number> {
  if (localEntries.length === 0) return 0

  const remoteKeys = new Set(
    remoteEntries.map((s) => sentenceKey(s.source, s.translation)),
  )

  let imported = 0
  for (const entry of localEntries) {
    if (remoteKeys.has(sentenceKey(entry.source, entry.translation))) continue

    await insertSavedSentence(userEmail, {
      source: entry.source,
      sourceLang: entry.sourceLang,
      translation: entry.translation,
      translationPinyin: entry.translationPinyin,
      sourcePinyin: entry.sourcePinyin ?? '',
      words: entry.words,
      grammar: entry.grammar,
    })
    imported++
  }

  return imported
}
