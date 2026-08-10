import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const authError = searchParams.get('error_description')

  if (authError) {
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent(authError)}`,
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent('認可コードがありません。')}`,
    )
  }

  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent('Supabase が未設定です。')}`,
    )
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('[auth/callback]', error)
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent(error.message)}`,
    )
  }

  return NextResponse.redirect(`${origin}/`)
}
