import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

let client: SupabaseClient | null = null

/** Browser Supabase client — PKCE verifier stored in cookies via @supabase/ssr. */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (!client) {
    client = createBrowserClient(supabaseUrl!, supabaseAnonKey!)
  }
  return client
}

export function getAuthCallbackUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  return siteUrl ? `${siteUrl}/auth/callback` : ''
}
