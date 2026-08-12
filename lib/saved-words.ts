import type { NotebookEntry, ReviewStatus, Word } from './huamaster-data'
import {
  applySrsGrade,
  initialSrsState,
  statusAfterSrs,
  type SrsGrade,
  type SrsState,
} from './srs'
import {
  getAuthenticatedSupabase,
  withSupabaseDataRetry,
} from './supabase-data'

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
  due_at?: string | null
  interval_days?: number | null
  ease?: number | null
  repetitions?: number | null
  last_reviewed_at?: string | null
}

function rowToEntry(row: SavedWordRow): NotebookEntry {
  const fallback = initialSrsState(new Date(row.added_at).getTime())
  return {
    id: row.id,
    hanzi: row.hanzi,
    pinyin: row.pinyin,
    bopomofo: row.bopomofo,
    jp: row.jp,
    pos: row.pos,
    status: row.status,
    addedAt: new Date(row.added_at).getTime(),
    dueAt: row.due_at ? new Date(row.due_at).getTime() : fallback.dueAt,
    intervalDays: row.interval_days ?? fallback.intervalDays,
    ease: row.ease ?? fallback.ease,
    repetitions: row.repetitions ?? fallback.repetitions,
    lastReviewedAt: row.last_reviewed_at
      ? new Date(row.last_reviewed_at).getTime()
      : null,
  }
}

function entryToSrsState(entry: NotebookEntry): SrsState {
  return {
    dueAt: entry.dueAt,
    intervalDays: entry.intervalDays,
    ease: entry.ease,
    repetitions: entry.repetitions,
    lastReviewedAt: entry.lastReviewedAt,
  }
}

export async function fetchSavedWords(
  userEmail: string,
): Promise<NotebookEntry[]> {
  return withSupabaseDataRetry(async () => {
    const supabase = await getAuthenticatedSupabase()

    const { data, error } = await supabase
      .from('saved_words')
      .select('*')
      .eq('user_email', userEmail)
      .order('added_at', { ascending: false })

    if (error) throw error
    return (data as SavedWordRow[]).map(rowToEntry)
  })
}

export async function insertSavedWord(
  userEmail: string,
  word: Word,
): Promise<NotebookEntry> {
  return withSupabaseDataRetry(async () => {
    const supabase = await getAuthenticatedSupabase()
    const srs = initialSrsState()

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
        due_at: new Date(srs.dueAt).toISOString(),
        interval_days: srs.intervalDays,
        ease: srs.ease,
        repetitions: srs.repetitions,
        last_reviewed_at: null,
      })
      .select('*')
      .single()

    if (error) throw error
    return rowToEntry(data as SavedWordRow)
  })
}

export async function deleteSavedWordByHanzi(
  userEmail: string,
  hanzi: string,
): Promise<void> {
  await withSupabaseDataRetry(async () => {
    const supabase = await getAuthenticatedSupabase()

    const { error } = await supabase
      .from('saved_words')
      .delete()
      .eq('user_email', userEmail)
      .eq('hanzi', hanzi)

    if (error) throw error
  })
}

export async function deleteSavedWordById(
  userEmail: string,
  id: string,
): Promise<void> {
  await withSupabaseDataRetry(async () => {
    const supabase = await getAuthenticatedSupabase()

    const { error } = await supabase
      .from('saved_words')
      .delete()
      .eq('user_email', userEmail)
      .eq('id', id)

    if (error) throw error
  })
}

export async function updateSavedWordStatus(
  userEmail: string,
  id: string,
  status: ReviewStatus,
): Promise<void> {
  await withSupabaseDataRetry(async () => {
    const supabase = await getAuthenticatedSupabase()

    const { error } = await supabase
      .from('saved_words')
      .update({ status })
      .eq('user_email', userEmail)
      .eq('id', id)

    if (error) throw error
  })
}

/** Persist SRS fields after a review grade. Returns the updated entry. */
export async function reviewSavedWord(
  userEmail: string,
  entry: NotebookEntry,
  grade: SrsGrade,
  now = Date.now(),
): Promise<NotebookEntry> {
  const nextSrs = applySrsGrade(entryToSrsState(entry), grade, now)
  const nextStatus = statusAfterSrs(nextSrs, entry.status)

  return withSupabaseDataRetry(async () => {
    const supabase = await getAuthenticatedSupabase()

    const { data, error } = await supabase
      .from('saved_words')
      .update({
        status: nextStatus,
        due_at: new Date(nextSrs.dueAt).toISOString(),
        interval_days: nextSrs.intervalDays,
        ease: nextSrs.ease,
        repetitions: nextSrs.repetitions,
        last_reviewed_at: nextSrs.lastReviewedAt
          ? new Date(nextSrs.lastReviewedAt).toISOString()
          : null,
      })
      .eq('user_email', userEmail)
      .eq('id', entry.id)
      .select('*')
      .single()

    if (error) throw error
    return rowToEntry(data as SavedWordRow)
  })
}
