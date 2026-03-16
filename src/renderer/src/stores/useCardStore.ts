import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LayoutType, TopicSuggestion, CardData, Category } from '@/types'
import { DUMMY_SLIDES } from '@/lib/dummyData'

interface CardStore {
  // 검색 상태
  selectedCategory: Category | 'all'
  topics: TopicSuggestion[]
  selectedTopic: TopicSuggestion | null
  isSearching: boolean

  // 카드 편집 상태 (멀티 슬라이드)
  slides: CardData[]
  currentSlideIndex: number
  cardData: CardData // 항상 slides[currentSlideIndex]와 동기화
  selectedLayout: LayoutType

  // 글로벌 폰트 크기 (persist, 새 카드 생성 시에도 적용)
  globalKeywordFontSize: number
  globalDescriptionFontSize: number

  // 액션
  setCategory: (cat: Category | 'all') => void
  setTopics: (topics: TopicSuggestion[]) => void
  selectTopic: (topic: TopicSuggestion) => void
  setSearching: (v: boolean) => void
  setCardData: (data: Partial<CardData>) => void
  setSlides: (slides: CardData[]) => void
  setCurrentSlide: (index: number) => void
  addSlide: () => void
  removeSlide: (index: number) => void
  setLayout: (layout: LayoutType) => void
  setGlobalFontSize: (keywordFontSize: number, descriptionFontSize: number) => void
  resetCard: () => void
}

export const useCardStore = create<CardStore>()(persist((set) => ({
  selectedCategory: 'all',
  topics: [],
  selectedTopic: null,
  isSearching: false,

  slides: DUMMY_SLIDES,
  currentSlideIndex: 0,
  cardData: DUMMY_SLIDES[0],
  selectedLayout: 'image-background',
  globalKeywordFontSize: 68,
  globalDescriptionFontSize: 33,

  setCategory: (cat) => set({ selectedCategory: cat }),
  setTopics: (topics) => set({ topics }),

  selectTopic: (topic) => {
    const source = `출처: ${(topic.relatedArticles || []).map((a) => a.source).join(', ') || '뉴스'} 종합`
    const categoryHashtag: Record<string, string> = {
      ai: '#AI', tech: '#기술', stocks: '#주식', economy: '#경제',
      war: '#국제', society: '#사회', science: '#과학'
    }
    const hashtags = [
      categoryHashtag[topic.category] || '#뉴스',
      '#카드뉴스',
      '#뉴스'
    ]

    // 기본 5장 슬라이드 생성 (AI 검증 후 교체됨)
    const defaultSlides: CardData[] = [
      {
        keyword: topic.title,
        title: topic.summary.slice(0, 15),
        description: '',
        source: '',
        hashtags: []
      },
      {
        keyword: topic.title.split(',')[0].slice(0, 12),
        title: '핵심 내용',
        description: topic.summary,
        source: '',
        hashtags: []
      },
      {
        keyword: '상세 분석',
        title: '관련 동향',
        description: topic.summary,
        source: '',
        hashtags: []
      },
      {
        keyword: '전망',
        title: '앞으로의 변화',
        description: '',
        source: '',
        hashtags: []
      },
      {
        keyword: '핵심 정리',
        title: topic.title,
        description: topic.summary,
        source,
        hashtags
      }
    ]

    set({
      selectedTopic: topic,
      slides: defaultSlides,
      currentSlideIndex: 0,
      cardData: defaultSlides[0]
    })
  },

  setSearching: (v) => set({ isSearching: v }),

  setCardData: (data) =>
    set((s) => {
      const updated = { ...s.slides[s.currentSlideIndex], ...data }
      const newSlides = [...s.slides]
      newSlides[s.currentSlideIndex] = updated
      return { cardData: updated, slides: newSlides }
    }),

  setSlides: (slides) =>
    set((s) => {
      const withFont = slides.map((sl) => ({
        ...sl,
        keywordFontSize: sl.keywordFontSize || s.globalKeywordFontSize,
        descriptionFontSize: sl.descriptionFontSize || s.globalDescriptionFontSize
      }))
      return {
        slides: withFont,
        currentSlideIndex: 0,
        cardData: withFont[0]
      }
    }),

  setCurrentSlide: (index) =>
    set((s) => ({
      currentSlideIndex: Math.max(0, Math.min(index, s.slides.length - 1)),
      cardData: s.slides[Math.max(0, Math.min(index, s.slides.length - 1))]
    })),

  addSlide: () =>
    set((s) => {
      const newSlide: CardData = {
        keyword: '새 슬라이드',
        title: '',
        description: '',
        source: '',
        hashtags: [],
        backgroundImageUrl: s.slides[0]?.backgroundImageUrl,
        textBlocks: [],
        keywordFontSize: s.globalKeywordFontSize,
        descriptionFontSize: s.globalDescriptionFontSize
      }
      const newSlides = [...s.slides, newSlide]
      const newIndex = newSlides.length - 1
      return {
        slides: newSlides,
        currentSlideIndex: newIndex,
        cardData: newSlide
      }
    }),

  removeSlide: (index) =>
    set((s) => {
      if (s.slides.length <= 1) return s
      const newSlides = s.slides.filter((_, i) => i !== index)
      const newIndex = Math.min(s.currentSlideIndex, newSlides.length - 1)
      return {
        slides: newSlides,
        currentSlideIndex: newIndex,
        cardData: newSlides[newIndex]
      }
    }),

  setLayout: (layout) => set({ selectedLayout: layout }),

  setGlobalFontSize: (keywordFontSize, descriptionFontSize) =>
    set((s) => {
      const newSlides = s.slides.map((sl) => ({
        ...sl,
        keywordFontSize,
        descriptionFontSize
      }))
      return {
        globalKeywordFontSize: keywordFontSize,
        globalDescriptionFontSize: descriptionFontSize,
        slides: newSlides,
        cardData: { ...s.cardData, keywordFontSize, descriptionFontSize }
      }
    }),

  resetCard: () =>
    set((s) => ({
      slides: DUMMY_SLIDES,
      currentSlideIndex: 0,
      cardData: DUMMY_SLIDES[0],
      selectedLayout: 'image-background',
      globalKeywordFontSize: s.globalKeywordFontSize,
      globalDescriptionFontSize: s.globalDescriptionFontSize
    }))
}), {
  name: 'card-news-store',
  version: 1,
  migrate: (persisted: any) => {
    // 유효하지 않은 layout → image-background로 폴백
    const validLayouts = ['image-background', 'top-bottom-split']
    if (persisted && !validLayouts.includes(persisted.selectedLayout)) {
      persisted.selectedLayout = 'image-background'
    }
    return persisted
  },
  partialize: (state) => {
    // data URL(수 MB)은 localStorage에 저장하면 용량 초과 → 외부 URL만 유지
    const sanitizeImageUrl = (url?: string) => {
      if (!url) return url
      // data:image 는 너무 큼 → 저장하지 않음 (Google 이미지 프록시 결과 등)
      if (url.startsWith('data:') && url.length > 10000) return undefined
      return url
    }
    const cleanSlides = state.slides.map((s) => ({
      ...s,
      backgroundImageUrl: sanitizeImageUrl(s.backgroundImageUrl)
    }))
    const cleanCardData = {
      ...state.cardData,
      backgroundImageUrl: sanitizeImageUrl(state.cardData.backgroundImageUrl)
    }

    return {
      selectedCategory: state.selectedCategory,
      topics: state.topics,
      selectedTopic: state.selectedTopic,
      slides: cleanSlides,
      currentSlideIndex: state.currentSlideIndex,
      cardData: cleanCardData,
      selectedLayout: state.selectedLayout,
      globalKeywordFontSize: state.globalKeywordFontSize,
      globalDescriptionFontSize: state.globalDescriptionFontSize
    }
  }
}))
