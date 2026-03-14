import { supabase, isSupabaseConfigured } from './supabase'
import type { UserApiKeys } from '@/types'

/**
 * 클라우드에서 API 키를 가져온다 (id=1 단일 행)
 */
export async function loadKeysFromCloud(): Promise<UserApiKeys | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('api_keys')
    .select('serper_api_key, openai_api_key, unsplash_access_key, naver_client_id, naver_client_secret, gemini_api_key, llm_provider')
    .eq('id', 1)
    .single()

  if (error || !data) return null

  return {
    serper_api_key: data.serper_api_key || '',
    openai_api_key: data.openai_api_key || '',
    unsplash_access_key: data.unsplash_access_key || '',
    naver_client_id: data.naver_client_id || '',
    naver_client_secret: data.naver_client_secret || '',
    gemini_api_key: data.gemini_api_key || '',
    llm_provider: data.llm_provider || 'openai'
  }
}

/**
 * API 키를 클라우드에 저장한다 (id=1 행 업데이트)
 */
export async function syncKeysToCloud(keys: UserApiKeys): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { error } = await supabase
    .from('api_keys')
    .update({
      serper_api_key: keys.serper_api_key,
      openai_api_key: keys.openai_api_key,
      unsplash_access_key: keys.unsplash_access_key,
      naver_client_id: keys.naver_client_id,
      naver_client_secret: keys.naver_client_secret,
      gemini_api_key: keys.gemini_api_key,
      llm_provider: keys.llm_provider
    })
    .eq('id', 1)

  return !error
}

/**
 * 클라우드 키를 electron-store에 동기화
 */
export async function syncKeysOnLogin(): Promise<void> {
  const cloudKeys = await loadKeysFromCloud()
  if (!cloudKeys) return

  if (window.api) {
    const localKeys = await window.api.getSettings()

    const merged = {
      serperApiKey: cloudKeys.serper_api_key || localKeys.serperApiKey || '',
      openaiApiKey: cloudKeys.openai_api_key || localKeys.openaiApiKey || '',
      unsplashAccessKey: cloudKeys.unsplash_access_key || localKeys.unsplashAccessKey || '',
      naverClientId: cloudKeys.naver_client_id || localKeys.naverClientId || '',
      naverClientSecret: cloudKeys.naver_client_secret || localKeys.naverClientSecret || '',
      geminiApiKey: cloudKeys.gemini_api_key || localKeys.geminiApiKey || '',
      llmProvider: cloudKeys.llm_provider || localKeys.llmProvider || 'openai'
    }

    await window.api.setSettings(merged)
  }
}
