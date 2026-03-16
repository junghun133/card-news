import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCardStore } from '@/stores/useCardStore'
import { useToastStore } from '@/stores/useToastStore'
import { DUMMY_TOPICS } from '@/lib/dummyData'
import { saveNewsSearch, loadNewsSearches, deleteNewsSearch } from '@/lib/newsSearchService'
import { isSupabaseConfigured } from '@/lib/supabase'
import Button from '@/components/common/Button'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import type { Category, NewsSearch, TopicSuggestion } from '@/types'

const CATEGORIES: { label: string; value: Category | 'all'; icon: string }[] = [
  { label: '전체', value: 'all', icon: '📰' },
  { label: 'AI', value: 'ai', icon: '🤖' },
  { label: '기술', value: 'tech', icon: '💻' },
  { label: '주식', value: 'stocks', icon: '📈' },
  { label: '경제', value: 'economy', icon: '💰' },
  { label: '국제', value: 'war', icon: '🌍' },
  { label: '사회', value: 'society', icon: '🏛️' },
  { label: '과학', value: 'science', icon: '🔬' }
]

const CATEGORY_COLORS: Record<Category, string> = {
  ai: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  tech: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  stocks: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  economy: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  war: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  society: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  science: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
}

const CATEGORY_LABEL: Record<Category, string> = {
  ai: 'AI', tech: '기술', stocks: '주식', economy: '경제',
  war: '국제', society: '사회', science: '과학'
}

type TabType = 'current' | 'past'

/** 과거 검색에서 추출한 개별 주제 */
interface PastTopic extends TopicSuggestion {
  searchId: string
  searchDate: string
}

const ITEMS_PER_PAGE = 8

export default function SearchPage() {
  const navigate = useNavigate()
  const {
    selectedCategory,
    setCategory,
    topics,
    setTopics,
    isSearching,
    setSearching,
    selectTopic,
    setSlides
  } = useCardStore()
  const addToast = useToastStore((s) => s.addToast)
  const [loaded, setLoaded] = useState(false)
  const [validating, setValidating] = useState<string | null>(null)
  const [loadingStep, setLoadingStep] = useState<string>('')
  const [loadingPercent, setLoadingPercent] = useState<number>(0)
  const [searchKeyword, setSearchKeyword] = useState('')

  // 탭 상태 — 기본: 과거 검색 (이전 수집 뉴스 확인 우선)
  const [activeTab, setActiveTab] = useState<TabType>(isSupabaseConfigured ? 'past' : 'current')

  // 이번 검색 페이징
  const [currentPage, setCurrentPage] = useState(0)

  // 과거 검색 상태
  const [searches, setSearches] = useState<NewsSearch[]>([])
  const [historyPage, setHistoryPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [pastPage, setPastPage] = useState(0)

  // 과거 검색 → 개별 주제 플랫 리스트
  const pastTopics: PastTopic[] = searches.flatMap((search) =>
    search.topics.map((topic) => ({
      ...topic,
      searchId: search.id,
      searchDate: search.created_at
    }))
  )

  const loadHistory = useCallback(async (page: number = 0, append: boolean = false) => {
    if (!isSupabaseConfigured) return
    setLoadingHistory(true)
    try {
      const result = await loadNewsSearches(page)
      if (result.error) {
        console.warn('[SearchPage] History load error:', result.error)
      }
      setSearches((prev) => (append ? [...prev, ...result.data] : result.data))
      setHasMore(result.hasMore)
      setHistoryPage(page)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  // 과거 탭 진입 시 로드
  useEffect(() => {
    if (activeTab === 'past') {
      loadHistory(0)
    }
  }, [activeTab, loadHistory])

  const handleLoadNews = async () => {
    setSearching(true)

    try {
      if (window.api) {
        const cat = selectedCategory === 'all' ? 'all' : selectedCategory
        const result = await window.api.searchNews(cat)
        if (result.success && result.topics?.length > 0) {
          setTopics(result.topics)
          setLoaded(true)
          setCurrentPage(0)
          setActiveTab('current')
          addToast('success', `${result.topics.length}개 주제를 찾았습니다.`)

          // DB에 자동 저장
          if (isSupabaseConfigured) {
            saveNewsSearch(selectedCategory as Category | 'all', result.topics).then((saveResult) => {
              if (saveResult.success) {
                console.log('[SearchPage] 검색 기록 저장 성공')
              } else {
                console.warn('[SearchPage] 검색 기록 저장 실패:', saveResult.error)
                addToast('error', `검색 기록 저장 실패: ${saveResult.error}`)
              }
            }).catch((e) => {
              console.warn('[SearchPage] Auto-save error:', e)
              addToast('error', `검색 기록 저장 오류: ${e.message}`)
            })
          }
        } else {
          console.warn('API fallback to dummy data:', result.error)
          addToast('error', result.error || 'API 실패. 더미 데이터로 표시합니다.')
          setTopics(DUMMY_TOPICS)
          setLoaded(true)
          setActiveTab('current')
        }
      } else {
        setTimeout(() => {
          setTopics(DUMMY_TOPICS)
          setLoaded(true)
          setActiveTab('current')
        }, 1000)
      }
    } catch (err: any) {
      console.error('Search error:', err)
      addToast('error', err.message || '뉴스를 불러오는데 실패했습니다.')
      setTopics(DUMMY_TOPICS)
      setLoaded(true)
    } finally {
      setSearching(false)
    }
  }

  const handleKeywordSearch = async () => {
    if (!searchKeyword.trim()) return
    setSearching(true)

    try {
      if (window.api) {
        const result = await window.api.searchNewsByKeyword(searchKeyword.trim())
        if (result.success && result.topics?.length > 0) {
          setTopics(result.topics)
          setLoaded(true)
          setCurrentPage(0)
          setActiveTab('current')
          addToast('success', `"${searchKeyword}" 관련 ${result.topics.length}개 주제를 찾았습니다.`)

          // DB에 자동 저장
          if (isSupabaseConfigured) {
            saveNewsSearch('all', result.topics).catch((e) => {
              console.warn('[SearchPage] Auto-save error:', e)
            })
          }
        } else {
          addToast('error', result.error || `"${searchKeyword}" 관련 뉴스를 찾을 수 없습니다.`)
        }
      }
    } catch (err: any) {
      console.error('Keyword search error:', err)
      addToast('error', err.message || '키워드 검색에 실패했습니다.')
    } finally {
      setSearching(false)
    }
  }

  const filteredTopics =
    selectedCategory === 'all' ? topics : topics.filter((t) => t.category === selectedCategory)

  const handleSelectTopic = async (topic: TopicSuggestion) => {
    setValidating(topic.id)
    setLoadingStep('준비 중...')
    setLoadingPercent(5)

    // 실시간 진행 이벤트 수신
    let unsubscribe: (() => void) | null = null
    if (window.api?.onValidateProgress) {
      unsubscribe = window.api.onValidateProgress((step, percent) => {
        if (step) setLoadingStep(step)
        if (percent > 0) setLoadingPercent(percent)
      })
    }

    try {
      if (window.api) {
        const result = await window.api.validateNews(topic)

        if (result.success && result.slides?.length > 0) {
          setLoadingStep('카드 생성 완료!')
          setLoadingPercent(100)
          selectTopic(topic)
          setSlides(result.slides)
          await new Promise((r) => setTimeout(r, 400))
          unsubscribe?.()
          setValidating(null)
          setLoadingStep('')
          setLoadingPercent(0)
          navigate('/editor')
          return
        }
      }
    } catch (err) {
      console.warn('Validate fallback:', err)
      addToast('info', 'AI 검증 실패. 기본 데이터로 진행합니다.')
    }

    unsubscribe?.()
    selectTopic(topic)
    setValidating(null)
    setLoadingStep('')
    setLoadingPercent(0)
    navigate('/editor')
  }

  const handleDeleteSearch = async (id: string) => {
    const result = await deleteNewsSearch(id)
    if (result.success) {
      setSearches((prev) => prev.filter((s) => s.id !== id))
      addToast('success', '검색 기록이 삭제되었습니다.')
    } else {
      addToast('error', '삭제에 실패했습니다.')
    }
  }

  const handleLoadMoreHistory = () => {
    loadHistory(historyPage + 1, true)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return '방금 전'
    if (diffMin < 60) return `${diffMin}분 전`
    if (diffHour < 24) return `${diffHour}시간 전`
    if (diffDay < 7) return `${diffDay}일 전`
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // 페이징 계산
  const currentPagedTopics = filteredTopics.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)
  const currentTotalPages = Math.ceil(filteredTopics.length / ITEMS_PER_PAGE)

  // 과거 검색에도 카테고리 필터 적용
  const filteredPastTopics = selectedCategory === 'all'
    ? pastTopics
    : pastTopics.filter((t) => t.category === selectedCategory)
  const pastPagedTopics = filteredPastTopics.slice(pastPage * ITEMS_PER_PAGE, (pastPage + 1) * ITEMS_PER_PAGE)
  const pastTotalPages = Math.ceil(filteredPastTopics.length / ITEMS_PER_PAGE)

  /** 기사의 가장 최근 날짜 추출 (Serper 상대날짜 문자열) */
  const getArticleDate = (topic: TopicSuggestion): string | null => {
    const articles = topic.relatedArticles || []
    if (articles.length === 0) return null
    // 첫 번째 기사의 날짜 반환 (Serper는 최신순 반환)
    return articles[0]?.date || null
  }

  /** 주제 관련 기사에서 출처별 건수 계산 */
  const getProviderCounts = (topic: TopicSuggestion) => {
    const articles = topic.relatedArticles || []
    const google = articles.filter((a) => a.provider === 'google').length
    const naver = articles.filter((a) => a.provider === 'naver').length
    const unknown = articles.length - google - naver
    return { google: google + unknown, naver, total: articles.length }
  }

  /** 공통 주제 리스트 행 렌더링 */
  const renderTopicRow = (topic: TopicSuggestion, dateStr?: string) => {
    const articleDate = getArticleDate(topic)
    const providers = getProviderCounts(topic)
    return (
      <div
        key={topic.id + (dateStr || '')}
        className="flex items-center gap-4 rounded-lg border border-cream-dark bg-white px-4 py-3 transition-all hover:shadow-sm dark:border-gray-600 dark:bg-gray-800"
      >
        {/* 카테고리 뱃지 */}
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${CATEGORY_COLORS[topic.category]}`}>
          {CATEGORY_LABEL[topic.category]}
        </span>

        {/* 주제 정보 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-bold text-text-dark dark:text-white">
              {topic.title}
            </h4>
            <span className="shrink-0 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
              {topic.interestScore}점
            </span>
            {/* 기사 날짜 표시 */}
            {articleDate && (
              <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                📅 {articleDate}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-text-gray dark:text-gray-400">
            {topic.summary}
          </p>
        </div>

        {/* 메타 정보 */}
        <div className="flex shrink-0 items-center gap-3">
          {dateStr && (
            <span className="text-[10px] text-text-light dark:text-gray-500">{formatDate(dateStr)}</span>
          )}
          {/* 출처별 기사 수 뱃지 */}
          <div className="flex items-center gap-1">
            {providers.google > 0 && (
              <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                G {providers.google}
              </span>
            )}
            {providers.naver > 0 && (
              <span className="shrink-0 rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:bg-green-900/30 dark:text-green-400">
                N {providers.naver}
              </span>
            )}
          </div>
          <span className="text-[10px] text-text-light dark:text-gray-500">
            {providers.total}건
          </span>
          <button
            onClick={() => handleSelectTopic(topic)}
            disabled={validating === topic.id}
            className="shrink-0 rounded-lg bg-blue-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 cursor-pointer transition-all"
          >
            {validating === topic.id ? '분석 중...' : '카드 만들기'}
          </button>
        </div>
      </div>
    )
  }

  /** 페이징 컨트롤 */
  const renderPagination = (page: number, totalPages: number, setPage: (p: number) => void) => {
    if (totalPages <= 1) return null
    return (
      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className="rounded px-2 py-1 text-xs text-text-gray hover:bg-cream-dark disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700 cursor-pointer disabled:cursor-not-allowed"
        >
          ◀ 이전
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setPage(i)}
            className={`h-7 w-7 rounded text-xs font-medium cursor-pointer transition-all ${
              i === page
                ? 'bg-blue-accent text-white'
                : 'text-text-gray hover:bg-cream-dark dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
          disabled={page === totalPages - 1}
          className="rounded px-2 py-1 text-xs text-text-gray hover:bg-cream-dark disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700 cursor-pointer disabled:cursor-not-allowed"
        >
          다음 ▶
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* 카드 생성 로딩 오버레이 */}
      {validating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 rounded-2xl bg-white px-12 py-10 shadow-2xl dark:bg-gray-800">
            {/* 애니메이션 스피너 */}
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-accent/20 border-t-blue-accent" style={{ animationDuration: '1.2s' }} />
              <div className="absolute inset-2 animate-spin rounded-full border-4 border-purple-400/20 border-b-purple-400" style={{ animationDuration: '1.8s', animationDirection: 'reverse' }} />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">📰</div>
            </div>
            {/* 상태 텍스트 */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-lg font-bold text-text-dark dark:text-white">카드뉴스 생성 중</p>
              <p className="animate-pulse text-sm text-blue-accent">{loadingStep}</p>
            </div>
            {/* 프로그레스 바 */}
            <div className="h-1.5 w-64 overflow-hidden rounded-full bg-cream-dark dark:bg-gray-600">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-accent to-purple-500 transition-all duration-700"
                style={{
                  width: `${loadingPercent}%`
                }}
              />
            </div>
            <p className="text-[11px] text-text-light dark:text-gray-500">보통 10~20초 정도 걸려요</p>
          </div>
        </div>
      )}

      {/* 상단 헤더: 탭 + 카테고리 + 새 검색 버튼 */}
      <div className="flex items-center justify-between border-b border-cream-dark pb-4 dark:border-gray-600">
        <div className="flex items-center gap-4">
          {/* 탭 전환 */}
          <div className="flex rounded-lg border border-cream-dark dark:border-gray-600">
            <button
              onClick={() => setActiveTab('current')}
              className={`rounded-l-lg px-4 py-1.5 text-sm font-medium cursor-pointer transition-all ${
                activeTab === 'current'
                  ? 'bg-blue-accent text-white'
                  : 'text-text-gray hover:bg-cream-dark dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              이번 검색 {loaded ? `(${filteredTopics.length})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`rounded-r-lg px-4 py-1.5 text-sm font-medium cursor-pointer transition-all ${
                activeTab === 'past'
                  ? 'bg-blue-accent text-white'
                  : 'text-text-gray hover:bg-cream-dark dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              과거 검색 {filteredPastTopics.length > 0 ? `(${filteredPastTopics.length})` : ''}
            </button>
          </div>

          {/* 카테고리 필터 */}
          <div className="flex gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => { setCategory(cat.value); setCurrentPage(0) }}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  selectedCategory === cat.value
                    ? 'bg-blue-accent text-white'
                    : 'bg-white text-text-gray hover:bg-cream-dark dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <span className="text-xs">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 키워드 검색 + 새 뉴스 검색 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-cream-dark dark:border-gray-600">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleKeywordSearch() }}
              placeholder="키워드 직접 검색..."
              disabled={isSearching}
              className="w-48 rounded-l-lg bg-transparent px-3 py-1.5 text-xs text-text-dark outline-none placeholder:text-text-light dark:text-white dark:placeholder:text-gray-500"
            />
            <button
              onClick={handleKeywordSearch}
              disabled={isSearching || !searchKeyword.trim()}
              className="rounded-r-lg bg-blue-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 cursor-pointer transition-all"
            >
              🔍
            </button>
          </div>
          <Button size="sm" onClick={handleLoadNews} disabled={isSearching}>
            {isSearching ? 'AI 분석 중...' : '새 뉴스 검색'}
          </Button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto pt-4">
        {isSearching && <LoadingSpinner text="AI가 최신 뉴스를 분석하고 있습니다..." />}

        {/* ─── 이번 검색 탭 ─── */}
        {activeTab === 'current' && !isSearching && (
          <>
            {!loaded && (
              <div className="flex flex-col items-center justify-center gap-6 py-20">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-text-dark dark:text-white">
                    최신 뉴스로 카드뉴스 만들기
                  </h2>
                  <p className="mt-2 text-sm text-text-light">
                    상단의 "새 뉴스 검색" 버튼을 눌러 최신 뉴스를 불러오세요.
                  </p>
                </div>
              </div>
            )}

            {loaded && filteredTopics.length === 0 && (
              <div className="py-16 text-center text-text-light">
                <p>선택한 카테고리에 해당하는 주제가 없습니다.</p>
              </div>
            )}

            {loaded && filteredTopics.length > 0 && (
              <div className="flex flex-col gap-2">
                {currentPagedTopics.map((topic) => renderTopicRow(topic))}
                {renderPagination(currentPage, currentTotalPages, setCurrentPage)}
              </div>
            )}
          </>
        )}

        {/* ─── 과거 검색 탭 ─── */}
        {activeTab === 'past' && !isSearching && (
          <>
            {loadingHistory && filteredPastTopics.length === 0 && (
              <LoadingSpinner text="과거 검색 기록을 불러오는 중..." />
            )}

            {!loadingHistory && filteredPastTopics.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-4 py-20">
                <p className="text-text-light">
                  {pastTopics.length === 0 ? '과거 검색 기록이 없습니다.' : '선택한 카테고리에 해당하는 주제가 없습니다.'}
                </p>
                {pastTopics.length === 0 && (
                  <p className="text-sm text-text-light">"새 뉴스 검색" 버튼을 눌러 뉴스를 수집하세요.</p>
                )}
              </div>
            )}

            {filteredPastTopics.length > 0 && (
              <div className="flex flex-col gap-2">
                {pastPagedTopics.map((topic) => renderTopicRow(topic, topic.searchDate))}
                {renderPagination(pastPage, pastTotalPages, setPastPage)}

                {/* 더 많은 과거 기록 로드 */}
                {hasMore && (
                  <div className="mt-2 flex justify-center">
                    <Button variant="ghost" size="sm" onClick={handleLoadMoreHistory} disabled={loadingHistory}>
                      {loadingHistory ? '불러오는 중...' : '과거 기록 더 불러오기'}
                    </Button>
                  </div>
                )}

                {/* 검색 세션 관리 (삭제) */}
                <div className="mt-4 border-t border-cream-dark pt-4 dark:border-gray-600">
                  <h4 className="mb-2 text-xs font-medium text-text-light dark:text-gray-500">검색 세션 관리</h4>
                  <div className="flex flex-wrap gap-2">
                    {searches.map((search) => (
                      <div
                        key={search.id}
                        className="flex items-center gap-2 rounded-lg bg-cream px-3 py-1.5 text-xs dark:bg-gray-700"
                      >
                        <span className="text-text-gray dark:text-gray-300">
                          {formatDate(search.created_at)} · {search.topics.length}건
                        </span>
                        <button
                          onClick={() => handleDeleteSearch(search.id)}
                          className="text-red-400 hover:text-red-600 cursor-pointer"
                          title="이 검색 기록 삭제"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
