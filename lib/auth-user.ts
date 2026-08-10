import type { User as SupabaseUser } from '@supabase/supabase-js'

const AVATAR_GRADIENTS = [
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-indigo-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
] as const

export type User = {
  id: string
  name: string
  email: string
  /** tailwind gradient classes when no photo is available */
  avatar: string
  avatarUrl: string | null
}

function avatarGradientForEmail(email: string): string {
  let hash = 0
  for (const char of email) {
    hash = (hash + char.charCodeAt(0)) | 0
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]!
}

export function mapSupabaseUser(user: SupabaseUser): User {
  const email = user.email ?? ''
  const metadata = user.user_metadata as Record<string, unknown> | undefined
  const name =
    (typeof metadata?.full_name === 'string' && metadata.full_name) ||
    (typeof metadata?.name === 'string' && metadata.name) ||
    email.split('@')[0] ||
    'User'
  const avatarUrl =
    (typeof metadata?.avatar_url === 'string' && metadata.avatar_url) ||
    (typeof metadata?.picture === 'string' && metadata.picture) ||
    null

  return {
    id: user.id,
    name,
    email,
    avatar: avatarGradientForEmail(email || user.id),
    avatarUrl,
  }
}
