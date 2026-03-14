import { supabase, isSupabaseConfigured } from './supabase'
import type { CardData, LayoutType, CardNewsProject } from '@/types'

interface SaveProjectParams {
  id?: string
  title: string
  category: string
  slides: CardData[]
  selectedLayout: LayoutType
}

/**
 * 프로젝트 저장 (신규: insert, 수정: update)
 */
export async function saveProject(params: SaveProjectParams): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase 미설정' }

  const payload = {
    title: params.title,
    category: params.category,
    slides: params.slides as unknown as Record<string, unknown>[],
    selected_layout: params.selectedLayout
  }

  if (params.id) {
    const { error } = await supabase
      .from('card_news_projects')
      .update(payload)
      .eq('id', params.id)

    if (error) return { success: false, error: error.message }
    return { success: true, id: params.id }
  } else {
    const { data, error } = await supabase
      .from('card_news_projects')
      .insert(payload)
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, id: data.id }
  }
}

/**
 * 프로젝트 목록 조회
 */
export async function loadProjects(): Promise<CardNewsProject[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('card_news_projects')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    slides: (row.slides || []) as CardData[],
    selected_layout: row.selected_layout as LayoutType,
    thumbnail_url: row.thumbnail_url || '',
    created_at: row.created_at,
    updated_at: row.updated_at
  }))
}

/**
 * 단일 프로젝트 조회
 */
export async function loadProject(id: string): Promise<CardNewsProject | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('card_news_projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    title: data.title,
    category: data.category,
    slides: (data.slides || []) as CardData[],
    selected_layout: data.selected_layout as LayoutType,
    thumbnail_url: data.thumbnail_url || '',
    created_at: data.created_at,
    updated_at: data.updated_at
  }
}

/**
 * 프로젝트 삭제
 */
export async function deleteProject(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { error } = await supabase
    .from('card_news_projects')
    .delete()
    .eq('id', id)

  return !error
}
