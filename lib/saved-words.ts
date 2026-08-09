import type { NotebookEntry, ReviewStatus, Word } from './huamaster-data'
import { getSupabaseClient } from './supabaseClient'

export type SavedWordRow = {
  id: string
  user_email: string
  hanzi: string
  pinyin: string
  bopomofo: string
  jp: string
  pos: string
  status: ReviewStatus
  added_at: string
}

function rowToEntry(row: SavedWordRow): NotebookEntry {
  return {
    id: row.id,
    hanzi: row.hanzi,
    pinyin: row.pinyin,
    bopomofo: row.bopomofo,
    jp: row.jp,
    pos: row.pos,
    status: row.status,
    addedAt: new Date(row.added_at).getTime(),
  }
}

export async function fetchSavedWords(
  userEmail: string,
): Promise<NotebookEntry[]> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const { data, error } = await supabase
    .from('saved_words')
    .select('*')
    .eq('user_email', userEmail)
    .order('added_at', { ascending: false })

  if (error) throw error
  return (data as SavedWordRow[]).map(rowToEntry)
}

export async function insertSavedWord(
  userEmail: string,
  word: Word,
): Promise<NotebookEntry> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const { data, error } = await supabase
    .from('saved_words')
    .insert({
      user_email: userEmail,
      hanzi: word.hanzi,
      pinyin: word.pinyin,
      bopomofo: word.bopomofo,
      jp: word.jp,
      pos: word.pos,
      status: 'reviewing',
    })
    .select('*')
    .single()

  if (error) throw error
  return rowToEntry(data as SavedWordRow)
}

export async function deleteSavedWordByHanzi(
  userEmail: string,
  hanzi: string,
): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const { error } = await supabase
    .from('saved_words')
    .delete()
    .eq('user_email', userEmail)
    .eq('hanzi', hanzi)

  if (error) throw error
}

export async function deleteSavedWordById(
  userEmail: string,
  id: string,
): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const { error } = await supabase
    .from('saved_words')
    .delete()
    .eq('user_email', userEmail)
    .eq('id', id)

  if (error) throw error
}

export async function updateSavedWordStatus(
  userEmail: string,
  id: string,
  status: ReviewStatus,
): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const { error } = await supabase
    .from('saved_words')
    .update({ status })
    .eq('user_email', userEmail)
    .eq('id', id)

  if (error) throw error
}
