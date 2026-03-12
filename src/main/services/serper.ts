import dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env') })

interface SerperNewsResult {
  title: string
  link: string
  snippet: string
  date: string
  source: string
}

interface SerperNewsResponse {
  news: SerperNewsResult[]
}

const CATEGORY_QUERIES: Record<string, string[]> = {
  ai: ['AI 인공지능 최신', 'ChatGPT AI 기술'],
  stocks: ['주식 시장 오늘', '코스피 나스닥 투자'],
  war: ['전쟁 국제정세', '우크라이나 중동 안보']
}

/**
 * Serper Google News API로 실시간 뉴스 검색
 */
export async function searchNews(
  category: string
): Promise<{ title: string; snippet: string; source: string; url: string; date: string }[]> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) throw new Error('SERPER_API_KEY가 설정되지 않았습니다.')

  // 카테고리별 쿼리 2개를 병렬로 검색
  const queries =
    category === 'all'
      ? ['AI 인공지능', '주식 시장', '국제정세 전쟁']
      : CATEGORY_QUERIES[category] || [category]

  const results = await Promise.all(
    queries.map(async (q) => {
      const response = await fetch('https://google.serper.dev/news', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q,
          gl: 'kr',
          hl: 'ko',
          num: 5
        })
      })

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status} ${response.statusText}`)
      }

      const data: SerperNewsResponse = await response.json()
      return data.news || []
    })
  )

  // 합치고 중복 제거 (같은 제목)
  const seen = new Set<string>()
  const articles: { title: string; snippet: string; source: string; url: string; date: string }[] =
    []

  for (const newsItems of results) {
    for (const item of newsItems) {
      if (seen.has(item.title)) continue
      seen.add(item.title)
      articles.push({
        title: item.title,
        snippet: item.snippet || '',
        source: item.source || '',
        url: item.link,
        date: item.date || ''
      })
    }
  }

  return articles
}
