export type Category = 'ai' | 'stocks' | 'war'
export type LayoutType = 'text-emphasis' | 'image-background' | 'split-layout' | 'gradient-card' | 'minimal-card'

export interface Article {
  title: string
  snippet: string
  source: string
  url: string
  date: string
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

export interface CardData {
  keyword: string
  title: string
  description: string
  source: string
  hashtags: string[]
  backgroundImageUrl?: string
  caption?: string
}

export interface AppSettings {
  serperApiKey: string
  openaiApiKey: string
  unsplashAccessKey: string
}
