import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 환경변수가 설정되지 않았습니다. 클라우드 기능이 비활성화됩니다.')
} else {
  console.log(`[Supabase] URL: ${supabaseUrl}`)
  console.log(`[Supabase] Key prefix: ${supabaseAnonKey.slice(0, 10)}... (len=${supabaseAnonKey.length})`)
  // Supabase anon key는 보통 eyJ...로 시작하는 JWT 토큰이어야 합니다.
  if (!supabaseAnonKey.startsWith('eyJ')) {
    console.warn('[Supabase] ⚠️ anon key 형식이 올바르지 않을 수 있습니다. Supabase Dashboard > Settings > API에서 anon public key를 확인하세요.')
  }
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
