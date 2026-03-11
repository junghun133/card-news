import dotenv from 'dotenv'
import { join } from 'path'
import { net } from 'electron'

dotenv.config({ path: join(process.cwd(), '.env') })

interface UnsplashPhoto {
  id: string
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
  }
  alt_description: string | null
  user: {
    name: string
  }
}

interface SearchResult {
  id: string
  url: string
  thumbUrl: string
  description: string
  photographer: string
}

/**
 * Unsplash에서 이미지 검색
 */
export async function searchImages(
  query: string,
  perPage = 9
): Promise<SearchResult[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) throw new Error('UNSPLASH_ACCESS_KEY가 설정되지 않았습니다.')

  const params = new URLSearchParams({
    query,
    per_page: String(perPage),
    orientation: 'squarish'
  })

  const url = `https://api.unsplash.com/search/photos?${params}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${accessKey}`
    }
  })

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const photos: UnsplashPhoto[] = data.results || []

  return photos.map((photo) => ({
    id: photo.id,
    url: `${photo.urls.raw}&w=1080&h=1080&fit=crop&q=80`,
    thumbUrl: photo.urls.small,
    description: photo.alt_description || '',
    photographer: photo.user.name
  }))
}

/**
 * 카테고리별 기본 키워드로 이미지 검색
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  ai: ['artificial intelligence', 'technology circuit', 'digital brain', 'robot future'],
  stocks: ['stock market chart', 'wall street trading', 'finance graph', 'cryptocurrency'],
  war: ['military geopolitics', 'world map strategy', 'defense security', 'diplomatic meeting']
}

export async function searchImagesByCategory(
  category: string,
  specificKeywords?: string[]
): Promise<SearchResult[]> {
  const keywords = specificKeywords || CATEGORY_KEYWORDS[category] || ['news']
  const query = keywords.slice(0, 2).join(' ')
  return searchImages(query)
}
