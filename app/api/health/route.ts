import { resolveGeminiApiKey } from '@/lib/gemini-client'
import { resolveGoogleTranslateApiKey } from '@/lib/google-translate'
import { isSupabaseConfigured } from '@/lib/supabaseClient'

export const runtime = 'nodejs'

function envSet(name: string): boolean {
  return Boolean(process.env[name]?.trim())
}

function geminiHint(): string | null {
  if (resolveGeminiApiKey()) return null
  if (envSet('NEXT_PUBLIC_GEMINI_API_KEY')) {
    return 'NEXT_PUBLIC_GEMINI_API_KEY はブラウザ公開用です。削除し、GEMINI_API_KEY（NEXT_PUBLIC_ なし）を Production に追加して Redeploy してください。'
  }
  if (!envSet('GEMINI_API_KEY') && !envSet('GOOGLE_API_KEY')) {
    return 'Vercel → Environment Variables に GEMINI_API_KEY を追加（Production にチェック）→ Redeploy してください。'
  }
  return null
}

function googleTranslateHint(): string | null {
  if (resolveGoogleTranslateApiKey()) return null
  if (!envSet('GOOGLE_TRANSLATE_API_KEY') && !envSet('GOOGLE_CLOUD_API_KEY')) {
    return 'Google Cloud Console で Cloud Translation API を有効化し、GOOGLE_TRANSLATE_API_KEY を .env.local / Vercel に追加してください。'
  }
  return null
}

/** Debug whether server env vars are loaded (never exposes secret values). */
export async function GET() {
  return Response.json({
    googleTranslate: Boolean(resolveGoogleTranslateApiKey()),
    gemini: Boolean(resolveGeminiApiKey()),
    supabase: isSupabaseConfigured(),
    envPresent: {
      GOOGLE_TRANSLATE_API_KEY: envSet('GOOGLE_TRANSLATE_API_KEY'),
      GOOGLE_CLOUD_API_KEY: envSet('GOOGLE_CLOUD_API_KEY'),
      GEMINI_API_KEY: envSet('GEMINI_API_KEY'),
      GOOGLE_API_KEY: envSet('GOOGLE_API_KEY'),
      NEXT_PUBLIC_GEMINI_API_KEY: envSet('NEXT_PUBLIC_GEMINI_API_KEY'),
    },
    hint: googleTranslateHint() ?? geminiHint(),
    nodeEnv: process.env.NODE_ENV ?? 'unknown',
    vercelEnv: process.env.VERCEL_ENV ?? null,
  })
}
