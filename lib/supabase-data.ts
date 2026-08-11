import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient'

type PostgrestErrorLike = {
  code?: string
  message?: string
}

export function isJwtClockSkewError(error: unknown): boolean {
  const err = error as PostgrestErrorLike
  return (
    err?.code === 'PGRST303' &&
    (err.message?.includes('JWT issued at future') ?? false)
  )
}

/** Wait until Supabase session is attached before Data API calls. */
export async function getAuthenticatedSupabase(): Promise<SupabaseClient> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error) throw error
  if (!session) {
    throw new Error('Not authenticated')
  }

  return supabase
}

/** Retry once after refresh when JWT clock skew is detected. */
export async function withSupabaseDataRetry<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (!isJwtClockSkewError(error)) throw error

    const supabase = getSupabaseClient()
    if (supabase) {
      await supabase.auth.refreshSession()
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    return await operation()
  }
}
