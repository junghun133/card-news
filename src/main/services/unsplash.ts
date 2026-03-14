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
 * Unsplash API 호출 (내부)
 */
async function fetchUnsplash(query: string, perPage: number, accessKey: string): Promise<UnsplashPhoto[]> {
  const params = new URLSearchParams({
    query,
    per_page: String(perPage)
  })

  const url = `https://api.unsplash.com/search/photos?${params}`

  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        'Accept-Version': 'v1'
      }
    })
  } catch (networkErr: any) {
    console.error('[Unsplash] Network error:', networkErr.message)
    throw new Error(`Unsplash 네트워크 오류: ${networkErr.message}`)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    console.error(`[Unsplash] API error: ${response.status} ${response.statusText}`, body)
    throw new Error(`Unsplash API ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  console.log(`[Unsplash] Results for "${query}": ${data.results?.length || 0} photos`)
  return data.results || []
}

/**
 * Unsplash에서 이미지 검색 (한국어 fallback 포함)
 */
export async function searchImages(
  query: string,
  perPage = 9
): Promise<SearchResult[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim()
  console.log(`[Unsplash] searchImages: query="${query}", key=${accessKey ? accessKey.slice(0, 6) + '...' : 'EMPTY'}`)

  if (!accessKey) throw new Error('UNSPLASH_ACCESS_KEY가 설정되지 않았습니다.')

  // 1차: 원래 쿼리로 검색
  let photos = await fetchUnsplash(query, perPage, accessKey)

  // 2차: 결과가 없으면 한국어를 제거하고 영문만으로 재시도
  if (photos.length === 0) {
    const englishOnly = query.replace(/[가-힣ㄱ-ㅎㅏ-ㅣ]+/g, ' ').replace(/\s+/g, ' ').trim()
    if (englishOnly && englishOnly !== query.trim()) {
      console.log(`[Unsplash] Fallback: english-only query="${englishOnly}"`)
      photos = await fetchUnsplash(englishOnly, perPage, accessKey)
    }
  }

  // 3차: 그래도 없으면 일반적인 뉴스 이미지 검색
  if (photos.length === 0) {
    console.log('[Unsplash] Fallback: generic "news technology" query')
    photos = await fetchUnsplash('news technology business', perPage, accessKey)
  }

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
  ai: ['artificial intelligence robot', 'machine learning data', 'AI technology future', 'neural network digital'],
  tech: ['semiconductor chip', 'smartphone technology', 'digital innovation', 'circuit board closeup'],
  stocks: ['stock market chart', 'trading finance', 'cryptocurrency bitcoin', 'investment graph'],
  economy: ['economy business city', 'real estate building', 'currency exchange rate', 'employment office'],
  war: ['military geopolitics', 'world map diplomacy', 'defense security', 'international summit'],
  society: ['city people community', 'education school', 'hospital medical', 'environment green'],
  science: ['science laboratory research', 'space rocket NASA', 'medical discovery', 'microscope biology']
}

export async function searchImagesByCategory(
  category: string,
  specificKeywords?: string[]
): Promise<SearchResult[]> {
  const keywords = specificKeywords || CATEGORY_KEYWORDS[category] || ['news headline']
  const query = keywords.slice(0, 2).join(' ')
  return searchImages(query)
}

/**
 * 슬라이드별 다양한 이미지를 검색 (각 슬라이드마다 다른 이미지)
 */
export async function searchDiverseImages(
  category: string,
  slideQueries: string[],
  fallbackKeywords?: string[]
): Promise<SearchResult[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim()
  if (!accessKey) throw new Error('UNSPLASH_ACCESS_KEY가 설정되지 않았습니다.')

  const categoryKw = CATEGORY_KEYWORDS[category] || ['news headline']
  const allImages: SearchResult[] = []
  const usedIds = new Set<string>()

  // 각 슬라이드별 쿼리로 이미지 1장씩 검색
  // 표지(i===0)는 후보를 10장으로 늘려 더 적절한 이미지 선택
  for (let i = 0; i < slideQueries.length; i++) {
    const query = slideQueries[i]?.trim()
    const isCover = i === 0
    const perPage = isCover ? 10 : 5

    try {
      let photos: UnsplashPhoto[] = []

      // 1차: 슬라이드별 쿼리가 있으면 사용
      if (query) {
        photos = await fetchUnsplash(query, perPage, accessKey)
      }

      // 2차(표지 전용): fallbackKeywords 활용
      if (photos.length === 0 && isCover && fallbackKeywords && fallbackKeywords.length > 0) {
        const fbQuery = fallbackKeywords.slice(0, 3).join(' ')
        console.log(`[Unsplash] Cover: Using fallbackKeywords "${fbQuery}" (query was "${query || 'empty'}")`)
        photos = await fetchUnsplash(fbQuery, perPage, accessKey)
      }

      // 3차: 쿼리가 없거나 결과가 없으면 카테고리 키워드 사용
      if (photos.length === 0) {
        const catKw = categoryKw[i % categoryKw.length]
        console.log(`[Unsplash] Slide ${i}: Using category keyword "${catKw}" (query was "${query || 'empty'}")`)
        photos = await fetchUnsplash(catKw, perPage, accessKey)
      }

      // 4차: 그래도 없으면 일반 검색
      if (photos.length === 0) {
        photos = await fetchUnsplash('news business technology', perPage, accessKey)
      }

      // 중복 안 되는 이미지 선택
      const uniquePhoto = photos.find((p) => !usedIds.has(p.id))
      if (uniquePhoto) {
        usedIds.add(uniquePhoto.id)
        allImages.push({
          id: uniquePhoto.id,
          url: `${uniquePhoto.urls.raw}&w=1080&h=1080&fit=crop&q=80`,
          thumbUrl: uniquePhoto.urls.small,
          description: uniquePhoto.alt_description || '',
          photographer: uniquePhoto.user.name
        })
      } else if (photos.length > 0) {
        // 중복이라도 넣음
        const photo = photos[0]
        allImages.push({
          id: photo.id,
          url: `${photo.urls.raw}&w=1080&h=1080&fit=crop&q=80`,
          thumbUrl: photo.urls.small,
          description: photo.alt_description || '',
          photographer: photo.user.name
        })
      }
    } catch (err: any) {
      console.warn(`[Unsplash] Slide ${i} image search failed:`, err.message)
    }
  }

  // fallback: 전체 이미지가 부족하면 카테고리 키워드로 보충
  if (allImages.length < slideQueries.length) {
    try {
      const fq = (fallbackKeywords || categoryKw).slice(0, 2).join(' ')
      const extraPhotos = await fetchUnsplash(fq, 10, accessKey)
      for (const photo of extraPhotos) {
        if (allImages.length >= slideQueries.length) break
        if (!usedIds.has(photo.id)) {
          usedIds.add(photo.id)
          allImages.push({
            id: photo.id,
            url: `${photo.urls.raw}&w=1080&h=1080&fit=crop&q=80`,
            thumbUrl: photo.urls.small,
            description: photo.alt_description || '',
            photographer: photo.user.name
          })
        }
      }
    } catch (err: any) {
      console.warn('[Unsplash] Fallback fill failed:', err.message)
    }
  }

  console.log(`[Unsplash] searchDiverseImages: ${allImages.length} images for ${slideQueries.length} slides`)
  return allImages
}
