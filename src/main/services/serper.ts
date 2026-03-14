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

/**
 * Serper가 반환하는 상대 날짜 문자열을 Date 객체로 변환
 * ex) "2시간 전", "3일 전", "2 hours ago", "3 days ago"
 */
export function parseArticleDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const now = new Date()

  // 한국어 상대시간: "X분 전", "X시간 전", "X일 전", "X주 전", "X개월 전", "X년 전"
  const koMatch = dateStr.match(/(\d+)\s*(분|시간|일|주|개월|년)\s*전/)
  if (koMatch) {
    const num = parseInt(koMatch[1])
    const unit = koMatch[2]
    const d = new Date(now)
    if (unit === '분') d.setMinutes(d.getMinutes() - num)
    else if (unit === '시간') d.setHours(d.getHours() - num)
    else if (unit === '일') d.setDate(d.getDate() - num)
    else if (unit === '주') d.setDate(d.getDate() - num * 7)
    else if (unit === '개월') d.setMonth(d.getMonth() - num)
    else if (unit === '년') d.setFullYear(d.getFullYear() - num)
    return d
  }

  // 영어 상대시간: "2 hours ago", "3 days ago", "1 week ago"
  const enMatch = dateStr.match(/(\d+)\s*(minute|hour|day|week|month|year)s?\s*ago/i)
  if (enMatch) {
    const num = parseInt(enMatch[1])
    const unit = enMatch[2].toLowerCase()
    const d = new Date(now)
    if (unit === 'minute') d.setMinutes(d.getMinutes() - num)
    else if (unit === 'hour') d.setHours(d.getHours() - num)
    else if (unit === 'day') d.setDate(d.getDate() - num)
    else if (unit === 'week') d.setDate(d.getDate() - num * 7)
    else if (unit === 'month') d.setMonth(d.getMonth() - num)
    else if (unit === 'year') d.setFullYear(d.getFullYear() - num)
    return d
  }

  // 절대 날짜 파싱 시도
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) return parsed

  return null
}

/**
 * 최근 N일 이내 기사만 필터링
 */
export function filterRecentArticles<T extends { date: string }>(
  articles: T[],
  maxDays = 30
): T[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - maxDays)

  const filtered = articles.filter((a) => {
    const articleDate = parseArticleDate(a.date)
    if (!articleDate) return true // 날짜 파싱 실패 시 포함 (안전)
    return articleDate >= cutoff
  })

  const removed = articles.length - filtered.length
  if (removed > 0) {
    console.log(`[Serper] 날짜 필터: ${articles.length}건 중 ${removed}건 제거 (${maxDays}일 이전), ${filtered.length}건 유지`)
  }
  return filtered
}

const CATEGORY_QUERIES: Record<string, string[]> = {
  ai: ['AI 인공지능 최신 뉴스', 'ChatGPT 생성AI 기술 트렌드', '로봇 자율주행 AI 산업'],
  tech: ['반도체 IT 기술 뉴스', '스마트폰 통신 테크 트렌드', '자율주행 로봇 기술 혁신'],
  stocks: ['주식 시장 오늘 뉴스', '코스피 나스닥 투자', '코인 암호화폐 시장 동향'],
  economy: ['경제 금리 환율 뉴스', '부동산 시장 동향', '고용 물가 GDP 경제지표'],
  war: ['우크라이나 러시아 전쟁 최신', '중동 이스라엘 전쟁 뉴스', '국제정세 외교 안보 분쟁', '북한 한반도 군사 동향'],
  society: ['사회 이슈 정책 뉴스', '교육 의료 환경 사회문제', '범죄 사건 사고 뉴스'],
  science: ['과학 연구 발견 뉴스', '우주 탐사 NASA 뉴스', '의학 신약 건강 연구']
}

/**
 * Serper Google News API로 실시간 뉴스 검색
 */
export async function searchNews(
  category: string
): Promise<{ title: string; snippet: string; source: string; url: string; date: string; provider?: string }[]> {
  const apiKey = process.env.SERPER_API_KEY?.trim()
  if (!apiKey) throw new Error('SERPER_API_KEY가 설정되지 않았습니다.')
  console.log(`[Serper] Using API key: ${apiKey.slice(0, 4)}...${apiKey.slice(-4)} (len=${apiKey.length})`)

  // 카테고리별 쿼리를 병렬로 검색 (all: 각 카테고리에서 2개씩)
  const queries =
    category === 'all'
      ? ['AI 인공지능 최신', '주식 경제 시장 동향', '우크라이나 러시아 전쟁', '중동 이스라엘 전쟁 분쟁', '국제정세 외교 안보', '과학 기술 혁신', '사회 이슈 정책']
      : CATEGORY_QUERIES[category] || [category]

  const results = await Promise.all(
    queries.map(async (q) => {
      try {
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
            num: 7
          })
        })

        if (!response.ok) {
          const body = await response.text().catch(() => '')
          console.error(`Serper API error: ${response.status} ${response.statusText}`, body)
          throw new Error(`Serper API error: ${response.status} ${response.statusText}`)
        }

        const data: SerperNewsResponse = await response.json()
        return data.news || []
      } catch (err) {
        if (err instanceof TypeError && err.message.includes('fetch')) {
          console.error('Serper network error:', err.message)
          throw new Error('네트워크 오류: Serper API에 연결할 수 없습니다.')
        }
        throw err
      }
    })
  )

  // 합치고 중복 제거 (같은 제목)
  const seen = new Set<string>()
  const articles: { title: string; snippet: string; source: string; url: string; date: string; provider?: string }[] =
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
        date: item.date || '',
        provider: 'google'
      })
    }
  }

  // 날짜 로깅
  console.log(`[Serper] 수집된 기사 ${articles.length}건:`)
  articles.forEach((a, i) => {
    console.log(`  ${i + 1}. [${a.date || '날짜없음'}] ${a.title.slice(0, 50)}`)
  })

  // 최근 30일 이내 기사만 필터링
  const recent = filterRecentArticles(articles, 30)
  console.log(`[Serper] 최종 결과: ${recent.length}건 (30일 이내)`)
  return recent
}

/**
 * 사용자 입력 키워드로 뉴스 검색
 */
export async function searchNewsByKeyword(
  keyword: string
): Promise<{ title: string; snippet: string; source: string; url: string; date: string; provider?: string }[]> {
  const apiKey = process.env.SERPER_API_KEY?.trim()
  if (!apiKey) throw new Error('SERPER_API_KEY가 설정되지 않았습니다.')

  console.log(`[Serper] 키워드 검색: "${keyword}"`)

  // 키워드 원본 + 상세 분석 변형으로 2회 검색
  const queries = [keyword, `${keyword} 최신 뉴스`]

  const results = await Promise.all(
    queries.map(async (q) => {
      try {
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
            num: 10
          })
        })

        if (!response.ok) {
          console.error(`Serper keyword search error: ${response.status}`)
          return []
        }

        const data: SerperNewsResponse = await response.json()
        return data.news || []
      } catch (err) {
        console.error('Serper keyword search failed:', err)
        return []
      }
    })
  )

  const seen = new Set<string>()
  const articles: { title: string; snippet: string; source: string; url: string; date: string; provider?: string }[] =
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
        date: item.date || '',
        provider: 'google'
      })
    }
  }

  // 날짜 로깅
  console.log(`[Serper] 키워드 검색 수집: ${articles.length}건`)
  articles.forEach((a, i) => {
    console.log(`  ${i + 1}. [${a.date || '날짜없음'}] ${a.title.slice(0, 50)}`)
  })

  // 최근 30일 이내 기사만 필터링
  const recent = filterRecentArticles(articles, 30)
  console.log(`[Serper] 키워드 검색 최종: ${recent.length}건 (30일 이내)`)
  return recent
}

/**
 * 선택된 주제에 대해 추가 검색하여 더 풍부한 기사 수집
 */
export async function searchNewsByTopic(
  topicTitle: string
): Promise<{ title: string; snippet: string; source: string; url: string; date: string; provider?: string }[]> {
  const apiKey = process.env.SERPER_API_KEY?.trim()
  if (!apiKey) throw new Error('SERPER_API_KEY가 설정되지 않았습니다.')

  // 주제 제목으로 2가지 변형 쿼리 검색 (원본 + 상세)
  const queries = [
    topicTitle,
    `${topicTitle} 상세 분석`
  ]

  console.log(`[Serper] 주제 추가검색: "${topicTitle}"`)

  const results = await Promise.all(
    queries.map(async (q) => {
      try {
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
            num: 10
          })
        })

        if (!response.ok) {
          console.error(`Serper topic search error: ${response.status}`)
          return []
        }

        const data: SerperNewsResponse = await response.json()
        return data.news || []
      } catch (err) {
        console.error('Serper topic search failed:', err)
        return []
      }
    })
  )

  const seen = new Set<string>()
  const articles: { title: string; snippet: string; source: string; url: string; date: string; provider?: string }[] = []

  for (const newsItems of results) {
    for (const item of newsItems) {
      if (seen.has(item.title)) continue
      seen.add(item.title)
      articles.push({
        title: item.title,
        snippet: item.snippet || '',
        source: item.source || '',
        url: item.link,
        date: item.date || '',
        provider: 'google'
      })
    }
  }

  // 날짜 로깅
  console.log(`[Serper] 주제 추가검색 수집: ${articles.length}건`)
  articles.forEach((a, i) => {
    console.log(`  ${i + 1}. [${a.date || '날짜없음'}] ${a.title.slice(0, 50)}`)
  })

  // 최근 30일 이내 기사만 필터링
  const recent = filterRecentArticles(articles, 30)
  console.log(`[Serper] 주제 추가검색 최종: ${recent.length}건 (30일 이내)`)
  return recent
}

/**
 * Google 이미지 검색 결과
 */
export interface GoogleImageResult {
  title: string
  imageUrl: string
  thumbnailUrl: string
  link: string
  source: string
}

/**
 * Serper Images API로 Google 이미지 검색
 */
export async function searchGoogleImages(
  query: string,
  num = 9,
  page = 1
): Promise<GoogleImageResult[]> {
  const apiKey = process.env.SERPER_API_KEY?.trim()
  if (!apiKey) throw new Error('SERPER_API_KEY가 설정되지 않았습니다.')

  console.log(`[Serper] Google 이미지 검색: "${query}" (page=${page})`)

  try {
    const response = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        gl: 'kr',
        hl: 'ko',
        num,
        page
      })
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error(`[Serper] Images API error: ${response.status}`, body)
      throw new Error(`Serper Images API ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    const images: any[] = data.images || []

    console.log(`[Serper] Google 이미지 결과: ${images.length}건`)

    return images.map((img) => ({
      title: img.title || '',
      imageUrl: img.imageUrl || '',
      thumbnailUrl: img.thumbnailUrl || img.imageUrl || '',
      link: img.link || '',
      source: img.source || ''
    }))
  } catch (err: any) {
    console.error('[Serper] Google 이미지 검색 실패:', err.message)
    throw err
  }
}

/**
 * 동영상 검색 결과
 */
export interface VideoResult {
  title: string
  link: string
  thumbnailUrl: string
  duration: string
  source: string
  date: string
  durationSeconds: number
}

/**
 * "M:SS" 또는 "H:MM:SS" 형식의 duration을 초로 변환
 */
function parseDurationToSeconds(duration: string): number {
  if (!duration) return 0
  const parts = duration.split(':').map(Number)
  if (parts.some(isNaN)) return 0

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return 0
}

/**
 * Serper Videos API로 짧은 영상 검색 (1분 이하 필터링)
 */
export async function searchVideos(
  query: string,
  maxDurationSeconds = 60
): Promise<VideoResult[]> {
  const apiKey = process.env.SERPER_API_KEY?.trim()
  if (!apiKey) throw new Error('SERPER_API_KEY가 설정되지 않았습니다.')

  console.log(`[Serper] 영상 검색: "${query}"`)

  try {
    const response = await fetch('https://google.serper.dev/videos', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        gl: 'kr',
        hl: 'ko',
        num: 20
      })
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error(`[Serper] Videos API error: ${response.status}`, body)
      throw new Error(`Serper Videos API ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    const videos: any[] = data.videos || []

    console.log(`[Serper] 영상 검색 결과: ${videos.length}건`)

    // duration 파싱 + 1분 이하 필터링
    const results: VideoResult[] = []
    for (const v of videos) {
      const durationSeconds = parseDurationToSeconds(v.duration || '')

      // duration이 없거나 maxDurationSeconds 이하만 포함
      if (durationSeconds > 0 && durationSeconds <= maxDurationSeconds) {
        results.push({
          title: v.title || '',
          link: v.link || '',
          thumbnailUrl: v.imageUrl || v.thumbnailUrl || '',
          duration: v.duration || '',
          source: v.source || '',
          date: v.date || '',
          durationSeconds
        })
      }
    }

    console.log(`[Serper] 1분 이하 영상: ${results.length}건`)
    return results
  } catch (err: any) {
    console.error('[Serper] 영상 검색 실패:', err.message)
    throw err
  }
}
