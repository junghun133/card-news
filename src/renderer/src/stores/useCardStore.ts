import { create } from 'zustand'
import type { LayoutType, TopicSuggestion, CardData, Category } from '@/types'
import { DUMMY_CARD_DATA } from '@/lib/dummyData'

interface CardStore {
  // 검색 상태
  selectedCategory: Category | 'all'
  topics: TopicSuggestion[]
  selectedTopic: TopicSuggestion | null
  isSearching: boolean

  // 카드 편집 상태
  cardData: CardData
  selectedLayout: LayoutType

  // 액션
  setCategory: (cat: Category | 'all') => void
  setTopics: (topics: TopicSuggestion[]) => void
  selectTopic: (topic: TopicSuggestion) => void
  setSearching: (v: boolean) => void
  setCardData: (data: Partial<CardData>) => void
  setLayout: (layout: LayoutType) => void
  resetCard: () => void
}

export const useCardStore = create<CardStore>((set) => ({
  selectedCategory: 'all',
  topics: [],
  selectedTopic: null,
  isSearching: false,

  cardData: DUMMY_CARD_DATA,
  selectedLayout: 'text-emphasis',

  setCategory: (cat) => set({ selectedCategory: cat }),
  setTopics: (topics) => set({ topics }),
  selectTopic: (topic) =>
    set({
      selectedTopic: topic,
      cardData: {
        keyword: topic.title.split(',')[0].slice(0, 12),
        title: topic.title,
        description: topic.summary,
        source: `출처: ${topic.relatedArticles.map((a) => a.source).join(', ')} 종합`,
        hashtags: [`#${topic.category === 'ai' ? 'AI' : topic.category === 'stocks' ? '주식' : '전쟁'}`, '#카드뉴스', '#뉴스'],
        backgroundImageUrl: DUMMY_CARD_DATA.backgroundImageUrl
      }
    }),
  setSearching: (v) => set({ isSearching: v }),
  setCardData: (data) => set((s) => ({ cardData: { ...s.cardData, ...data } })),
  setLayout: (layout) => set({ selectedLayout: layout }),
  resetCard: () => set({ cardData: DUMMY_CARD_DATA, selectedLayout: 'text-emphasis' })
}))
