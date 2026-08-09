type PostgrestErrorLike = {
  message?: string
  code?: string
  details?: string | null
  hint?: string | null
}

export function formatSupabaseError(error: unknown, action: string): string {
  const err = error as PostgrestErrorLike
  const message = err?.message ?? ''

  if (
    err?.code === 'PGRST205' ||
    message.includes('Could not find the table') ||
    message.includes('saved_words')
  ) {
    return 'saved_words テーブルが見つかりません。Supabase ダッシュボード → SQL Editor で supabase/saved_words.sql を実行してください。'
  }

  if (message) {
    return `${action}に失敗しました: ${message}`
  }

  return `${action}に失敗しました。Supabase の設定と saved_words テーブルを確認してください。`
}
