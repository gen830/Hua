import { resolveGeminiApiKey } from '@/lib/gemini-client'
import { isSupabaseConfigured } from '@/lib/supabaseClient'

export const runtime = 'nodejs'

/** Debug whether server env vars are loaded (never exposes secret values). */
export async function GET() {
  return Response.json({
    gemini: Boolean(resolveGeminiApiKey()),
    supabase: isSupabaseConfigured(),
    nodeEnv: process.env.NODE_ENV ?? 'unknown',
    vercelEnv: process.env.VERCEL_ENV ?? null,
  })
}
