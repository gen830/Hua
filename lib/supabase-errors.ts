type PostgrestErrorLike = {
  message?: string
  code?: string
  details?: string | null
  hint?: string | null
}

export function formatSupabaseError(error: unknown, action: string): string {
  const err = error as PostgrestErrorLike
  const message = err?.message ?? ''

  if (err?.code === 'PGRST303') {
    if (message.includes('JWT issued at future')) {
      return `${action}に失敗しました: PC の時計が Supabase より進んでいます。Windows の「日付と時刻」→「今すぐ同期」で時刻を合わせ、ログアウトして再ログインしてください。`
    }
    if (/expired|expire/i.test(message)) {
      return `${action}に失敗しました: ログインの有効期限が切れました。一度ログアウトして、Google で再ログインしてください。`
    }
    return `${action}に失敗しました: ログイン情報の検証に失敗しました。ログアウトして再ログインするか、PC の時刻設定を確認してください。`
  }

  if (
    err?.code === 'PGRST205' ||
    message.includes('Could not find the table') ||
    message.includes('saved_words')
  ) {
    return 'saved_words テーブルが見つかりません。Supabase ダッシュボード → SQL Editor で supabase/saved_words.sql を実行してください。'
  }

  if (
    err?.code === 'PGRST205' ||
    message.includes('saved_sentences')
  ) {
    return 'saved_sentences テーブルが見つかりません。Supabase ダッシュボード → SQL Editor で supabase/saved_sentences.sql を実行してください。'
  }

  if (message) {
    return `${action}に失敗しました: ${message}`
  }

  return `${action}に失敗しました。Supabase の設定と saved_words テーブルを確認してください。`
}
