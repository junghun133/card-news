import { filterRecentArticles } from './serper'

interface NaverNewsItem {
  title: string
  originallink: string
  link: string
  description: string
  pubDate: string
}

interface NaverNewsResponse {
  lastBuildDate: string
  total: number
  start: number
  display: number
  items: NaverNewsItem[]
}

type ArticleResult = { title: string; snippet: string; source: string; url: string; date: string; provider?: string }

/**
 * HTML 태그 제거 (네이버 API 응답에 <b></b> 등 포함)
 */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'")
}

/**
 * URL에서 도메인 추출 (출처 표시용)
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return ''
  }
}

/**
 * pubDate를 상대 시간 문자열로 변환
 * ex) "Thu, 13 Mar 2026 12:00:00 +0900" → "3시간 전"
 */
function formatRelativeDate(pubDate: string): string {
  try {
    const date = new Date(pubDate)
    if (isNaN(date.getTime())) return pubDate

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return '방금 전'
    if (diffMin < 60) return `${diffMin}분 전`
    if (diffHour < 24) return `${diffHour}시간 전`
    if (diffDay < 30) return `${diffDay}일 전`
    return `${Math.floor(diffDay / 30)}개월 전`
  } catch {
    return pubDate
  }
}

/**
 * 네이버 뉴스 검색 API 단일 쿼리 호출
 */
async function searchNaverNews(
  query: string,
  display = 20
): Promise<ArticleResult[]> {
  const clientId = process.env.NAVER_CLIENT_ID?.trim()
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) {
    return [] // 키 없으면 빈 배열 (에러 아님)
  }

  try {
    const params = new URLSearchParams({
      query,
      display: String(display),
      start: '1',
      sort: 'date'
    })

    const response = await fetch(
      `https://openapi.naver.com/v1/search/news.json?${params}`,
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret
        }
      }
    )

    if (!response.ok) {
      console.error(`[Naver] API error: ${response.status} ${response.statusText}`)
      return []
    }

    const data: NaverNewsResponse = await response.json()
    return (data.items || []).map((item) => ({
      title: stripHtml(item.title),
      snippet: stripHtml(item.description),
      source: extractDomain(item.originallink || item.link),
      url: item.originallink || item.link,
      date: formatRelativeDate(item.pubDate),
      provider: 'naver'
    }))
  } catch (err) {
    console.error('[Naver] Search failed:', err)
    return []
  }
}

/**
 * 키워드로 네이버 뉴스 검색 (2회 검색 → 중복 제거 → 30일 필터)
 */
export async function searchNaverNewsByKeyword(
  keyword: string
): Promise<ArticleResult[]> {
  const clientId = process.env.NAVER_CLIENT_ID?.trim()
  if (!clientId) return []

  console.log(`[Naver] 키워드 검색: "${keyword}"`)

  const queries = [keyword, `${keyword} 최신 뉴스`]
  const results = await Promise.all(queries.map((q) => searchNaverNews(q, 20)))

  const seen = new Set<string>()
  const articles: ArticleResult[] = []

  for (const items of results) {
    for (const item of items) {
      if (seen.has(item.title)) continue
      seen.add(item.title)
      articles.push(item)
    }
  }

  // 날짜 로깅
  console.log(`[Naver] 키워드 검색 수집: ${articles.length}건`)
  articles.forEach((a, i) => {
    console.log(`  ${i + 1}. [${a.date || '날짜없음'}] ${a.title.slice(0, 50)}`)
  })

  // 최근 7일 → 14일 점진적 필터링
  const recent = filterRecentArticles(articles, 7)
  const finalArticles = recent.length >= 5 ? recent : filterRecentArticles(articles, 14)
  console.log(`[Naver] 키워드 검색 최종: ${finalArticles.length}건 (최신순)`)
  return finalArticles
}

/**
 * 주제로 네이버 뉴스 추가 검색 (카드 생성 시 기사 보강)
 */
export async function searchNaverNewsByTopic(
  topicTitle: string
): Promise<ArticleResult[]> {
  const clientId = process.env.NAVER_CLIENT_ID?.trim()
  if (!clientId) return []

  console.log(`[Naver] 주제 추가검색: "${topicTitle}"`)

  const queries = [topicTitle, `${topicTitle} 상세 분석`]
  const results = await Promise.all(queries.map((q) => searchNaverNews(q, 20)))

  const seen = new Set<string>()
  const articles: ArticleResult[] = []

  for (const items of results) {
    for (const item of items) {
      if (seen.has(item.title)) continue
      seen.add(item.title)
      articles.push(item)
    }
  }

  console.log(`[Naver] 주제 추가검색 수집: ${articles.length}건`)
  articles.forEach((a, i) => {
    console.log(`  ${i + 1}. [${a.date || '날짜없음'}] ${a.title.slice(0, 50)}`)
  })

  const recent = filterRecentArticles(articles, 14)
  console.log(`[Naver] 주제 추가검색 최종: ${recent.length}건 (14일 이내)`)
  return recent
}
