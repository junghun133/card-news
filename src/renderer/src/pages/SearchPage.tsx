import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCardStore } from '@/stores/useCardStore'
import { useToastStore } from '@/stores/useToastStore'
import { DUMMY_TOPICS } from '@/lib/dummyData'
import Button from '@/components/common/Button'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import type { Category } from '@/types'

const CATEGORIES: { label: string; value: Category | 'all'; icon: string }[] = [
  { label: '전체', value: 'all', icon: '📰' },
  { label: 'AI', value: 'ai', icon: '🤖' },
  { label: '주식', value: 'stocks', icon: '📈' },
  { label: '전쟁', value: 'war', icon: '🌍' }
]

const CATEGORY_COLORS: Record<Category, string> = {
  ai: 'bg-purple-100 text-purple-700',
  stocks: 'bg-green-100 text-green-700',
  war: 'bg-red-100 text-red-700'
}

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
    setCardData
  } = useCardStore()
  const addToast = useToastStore((s) => s.addToast)
  const [loaded, setLoaded] = useState(false)
  const [validating, setValidating] = useState<string | null>(null)

  const handleLoadNews = async () => {
    setSearching(true)

    try {
      if (window.api) {
        const cat = selectedCategory === 'all' ? 'all' : selectedCategory
        const result = await window.api.searchNews(cat)
        if (result.success && result.topics?.length > 0) {
          setTopics(result.topics)
          setLoaded(true)
          addToast('success', `${result.topics.length}개 주제를 찾았습니다.`)
        } else {
          console.warn('API fallback to dummy data:', result.error)
          addToast('error', result.error || 'API 실패. 더미 데이터로 표시합니다.')
          setTopics(DUMMY_TOPICS)
          setLoaded(true)
        }
      } else {
        setTimeout(() => {
          setTopics(DUMMY_TOPICS)
          setLoaded(true)
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

  const filteredTopics =
    selectedCategory === 'all' ? topics : topics.filter((t) => t.category === selectedCategory)

  const handleSelectTopic = async (topic: (typeof topics)[0]) => {
    setValidating(topic.id)

    try {
      if (window.api) {
        const result = await window.api.validateNews(topic)
        if (result.success && result.cardData) {
          selectTopic(topic)
          setCardData(result.cardData)
          setValidating(null)
          navigate('/editor')
          return
        }
      }
    } catch (err) {
      console.warn('Validate fallback:', err)
      addToast('info', 'AI 검증 실패. 기본 데이터로 진행합니다.')
    }

    selectTopic(topic)
    setValidating(null)
    navigate('/editor')
  }

  return (
    <div className="flex h-full flex-col">
      {/* 카테고리 탭 */}
      <div className="flex gap-2 border-b border-cream-dark pb-4 dark:border-gray-600">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
              selectedCategory === cat.value
                ? 'bg-blue-accent text-white'
                : 'bg-white text-text-gray hover:bg-cream-dark dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto pt-6">
        {!loaded && !isSearching && (
          <div className="flex flex-col items-center justify-center gap-6 py-20">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-text-dark dark:text-white">
                최신 뉴스로 카드뉴스 만들기
              </h2>
              <p className="mt-2 text-text-light">
                AI, 주식, 전쟁 관련 최신 뉴스를 불러와 흥미로운 주제를 추천해드립니다.
              </p>
            </div>
            <Button size="lg" onClick={handleLoadNews}>
              최신 뉴스 불러오기
            </Button>
          </div>
        )}

        {isSearching && <LoadingSpinner text="AI가 최신 뉴스를 분석하고 있습니다..." />}

        {loaded && !isSearching && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-dark dark:text-white">
                추천 주제 ({filteredTopics.length}건)
              </h3>
              <Button variant="ghost" size="sm" onClick={handleLoadNews}>
                새로고침
              </Button>
            </div>
            {filteredTopics.map((topic) => (
              <div
                key={topic.id}
                className="flex flex-col gap-3 rounded-xl border border-cream-dark bg-white p-5 transition-all hover:shadow-md dark:border-gray-600 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${CATEGORY_COLORS[topic.category]}`}
                    >
                      {topic.category === 'ai'
                        ? 'AI'
                        : topic.category === 'stocks'
                          ? '주식'
                          : '전쟁'}
                    </span>
                    <span className="text-xs text-text-light">{topic.sourceCount}개 출처</span>
                  </div>
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-amber-700">
                    관심도 {topic.interestScore}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-text-dark dark:text-white">{topic.title}</h4>
                <p className="text-sm leading-relaxed text-text-gray dark:text-gray-300">
                  {topic.summary}
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSelectTopic(topic)}
                  disabled={validating === topic.id}
                  className="self-end"
                >
                  {validating === topic.id ? 'AI가 분석 중...' : '이 주제로 카드뉴스 만들기'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
