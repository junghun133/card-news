export type Category = 'ai' | 'stocks' | 'war' | 'economy' | 'tech' | 'society' | 'science'
export type LayoutType = 'image-background' | 'top-bottom-split'
export type LlmProvider = 'openai' | 'gemini'

export interface Article {
  title: string
  snippet: string
  fullText?: string
  source: string
  url: string
  date: string
  provider?: 'google' | 'naver'
}

export interface TopicSuggestion {
  id: string
  category: Category
  title: string
  summary: string
  interestScore: number
  sourceCount: number
  relatedArticles: Article[]
}

// 커스텀 텍스트 블록 (자유 위치 텍스트)
export interface TextBlock {
  id: string
  content: string
  x: number       // % (0-100)
  y: number       // % (0-100)
  fontSize: number // px
  color: string    // hex
  fontWeight: number
  maxWidth: number // % (0-100)
}

// 첫 카드 컬러 타이틀 세그먼트
export interface TitleSegment {
  text: string
  color?: string   // 미지정 시 기본 흰색
}

export interface CardData {
  keyword: string
  title: string
  description: string
  source: string
  hashtags: string[]
  backgroundImageUrl?: string
  caption?: string
  textBlocks?: TextBlock[]
  coverTitleSegments?: TitleSegment[]
  isProfileCard?: boolean
  showNewsIcon?: boolean
  imageSearchQuery?: string
  // 폰트 사이즈 커스텀 (미지정 시 레이아웃 기본값)
  keywordFontSize?: number
  titleFontSize?: number
  descriptionFontSize?: number
  // 콘텐츠 위치 (% 0-100, 드래그로 이동)
  keywordPosition?: { x: number; y: number }
  descriptionPosition?: { x: number; y: number }
  sourcePosition?: { x: number; y: number }
  watermark1Position?: { x: number; y: number }
  watermark2Position?: { x: number; y: number }
}

export interface VideoResult {
  title: string
  link: string
  thumbnailUrl: string
  duration: string
  source: string
  date: string
}

export interface AppSettings {
  serperApiKey: string
  openaiApiKey: string
  unsplashAccessKey: string
  naverClientId: string
  naverClientSecret: string
  geminiApiKey: string
  llmProvider: LlmProvider
}

export interface CardNewsProject {
  id: string
  title: string
  category: string
  slides: CardData[]
  selected_layout: LayoutType
  thumbnail_url?: string
  created_at: string
  updated_at: string
}

export interface UserApiKeys {
  serper_api_key: string
  openai_api_key: string
  unsplash_access_key: string
  naver_client_id: string
  naver_client_secret: string
  gemini_api_key: string
  llm_provider: string
}

// 뉴스 검색 기록
export interface NewsSearch {
  id: string
  category: Category | 'all'
  topics: TopicSuggestion[]
  created_at: string
}
