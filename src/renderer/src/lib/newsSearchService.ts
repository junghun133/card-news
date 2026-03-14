import { supabase, isSupabaseConfigured } from './supabase'
import type { TopicSuggestion, Category, NewsSearch } from '@/types'

const PAGE_SIZE = 10

/**
 * 뉴스 검색 결과를 DB에 저장
 */
export async function saveNewsSearch(
  category: Category | 'all',
  topics: TopicSuggestion[]
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase 미설정' }

  try {
    console.log(`[NewsSearch] Saving: category=${category}, topics=${topics.length}`)
    const payload = {
      category,
      topics: JSON.parse(JSON.stringify(topics))
    }
    console.log('[NewsSearch] Insert payload:', JSON.stringify(payload).slice(0, 200))

    const { data, error } = await supabase.from('news_searches').insert(payload).select()

    if (error) {
      console.error('[NewsSearch] Save error:', error.message, error.details, error.hint)
      return { success: false, error: `${error.message} (${error.hint || error.details || ''})` }
    }
    console.log('[NewsSearch] Save success:', data?.[0]?.id)
    return { success: true }
  } catch (err: any) {
    console.error('[NewsSearch] Save exception:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 검색 기록 로드 (페이징)
 */
export async function loadNewsSearches(
  page: number = 0
): Promise<{ data: NewsSearch[]; hasMore: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { data: [], hasMore: false, error: 'Supabase 미설정' }

  try {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, error, count } = await supabase
      .from('news_searches')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('[NewsSearch] Load error:', error)
      return { data: [], hasMore: false, error: error.message }
    }

    const searches: NewsSearch[] = (data || []).map((row: any) => ({
      id: row.id,
      category: row.category,
      topics: row.topics || [],
      created_at: row.created_at
    }))

    const total = count ?? 0
    const hasMore = from + PAGE_SIZE < total

    return { data: searches, hasMore }
  } catch (err: any) {
    console.error('[NewsSearch] Load exception:', err)
    return { data: [], hasMore: false, error: err.message }
  }
}

/**
 * 검색 기록 삭제
 */
export async function deleteNewsSearch(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase 미설정' }

  try {
    const { error } = await supabase
      .from('news_searches')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[NewsSearch] Delete error:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    console.error('[NewsSearch] Delete exception:', err)
    return { success: false, error: err.message }
  }
}
