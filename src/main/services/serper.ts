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

/**
 * 카테고리별 검색 쿼리 풀 — 매 검색마다 랜덤으로 4개 선택하여 다양한 결과 제공
 */
const CATEGORY_QUERY_POOL: Record<string, string[]> = {
  ai: [
    'AI 인공지능 충격 발표', 'ChatGPT 신기능 업데이트 오늘', '생성AI 논란 규제',
    'AI 대체 일자리 위기', 'OpenAI 구글 AI 경쟁', 'AI 딥페이크 사건 사고',
    'AI 스타트업 투자 유치', '인공지능 의료 혁신 성과', 'AI 저작권 소송 판결',
    'AI 반도체 엔비디아 실적', 'AI 로봇 상용화 출시', '생성AI 교육 학교 금지 허용'
  ],
  tech: [
    '반도체 전쟁 삼성 TSMC', 'IT 대기업 구조조정 해고', '스마트폰 신제품 출시 스펙',
    '자율주행 사고 논란', '사이버 보안 해킹 사건', '메타버스 VR AR 신제품',
    '배터리 전기차 기술 돌파', '양자컴퓨터 개발 성과', '5G 6G 통신 기술',
    '테크 기업 실적 발표 주가', '로봇 공장 자동화 도입', '클라우드 빅테크 경쟁'
  ],
  stocks: [
    '주식 폭락 급등 오늘', '코스피 나스닥 실시간 전망', '테마주 급등 이유',
    '개미 투자자 손실 수익', '공매도 논란 규제', '코인 비트코인 급등락',
    'IPO 상장 대어 청약', '배당주 고배당 추천', '환율 달러 원화 영향',
    '증권사 리포트 목표가', '외국인 기관 매수 매도', '부동산 REITs 투자'
  ],
  economy: [
    '금리 인상 인하 결정', '물가 상승 체감 서민', '부동산 폭락 급등 전망',
    '환율 급변 수출 기업 영향', '고용 실업률 취업난', '가계부채 역대 최대',
    '유가 국제유가 급변', '무역수지 적자 흑자', '경기침체 불황 경고',
    '재정적자 국가부채 논란', '소비 트렌드 변화 MZ', '글로벌 경제 위기 신호'
  ],
  war: [
    '우크라이나 러시아 전쟁 전황', '중동 이스라엘 가자 공격', '북한 미사일 도발 도발',
    '미중 갈등 대만 긴장', '한반도 안보 위기 군사', 'NATO 군비확장 방산',
    '핵무기 핵위협 확산', '난민 인도주의 위기', '사이버전 해킹 공격',
    '방산 수출 K방산 계약', '외교 정상회담 합의 결렬', '테러 위협 IS 극단주의'
  ],
  society: [
    '범죄 사건 충격 체포', '정치 스캔들 비리 수사', '교육 입시 정책 논란',
    '의료 파업 의사 간호사', '환경 기후변화 재난', '인구 감소 저출생 대책',
    '부동산 전세사기 피해', '노동 최저임금 근무환경', '성범죄 처벌 판결',
    '식품 안전 리콜 위해', '교통사고 음주운전 처벌', 'SNS 사이버폭력 논란'
  ],
  science: [
    '우주 탐사 화성 달 발견', '신약 개발 임상시험 성공', '기후변화 연구 경고',
    '공룡 화석 고고학 발견', '양자역학 물리학 돌파구', '유전자 편집 크리스퍼 논란',
    '전염병 바이러스 변이', '해양 탐사 심해 생물 발견', '핵융합 에너지 실험 성과',
    '뇌과학 치매 치료 연구', '소행성 충돌 위험 NASA', '줄기세포 재생의학 성과'
  ]
}

/**
 * 쿼리 풀에서 랜덤으로 N개 선택
 */
function pickRandomQueries(pool: string[], count: number): string[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
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

  // 카테고리별 쿼리 풀에서 랜덤 선택 (매번 다른 조합)
  let queries: string[]
  if (category === 'all') {
    // 전체: 각 카테고리에서 1~2개씩 랜덤 선택
    const allCategories = Object.keys(CATEGORY_QUERY_POOL)
    queries = allCategories.flatMap((cat) => pickRandomQueries(CATEGORY_QUERY_POOL[cat], 1))
    // 추가로 트렌딩 쿼리
    queries.push('오늘 속보 긴급 뉴스', '화제 논란 이슈 실시간')
  } else {
    const pool = CATEGORY_QUERY_POOL[category] || [category]
    queries = pickRandomQueries(pool, 4) // 4개 랜덤 선택 (기존 3개 → 4개)
  }

  console.log(`[Serper] 카테고리 "${category}" 쿼리: ${queries.join(' | ')}`)

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
            num: 10,
            tbs: 'qdr:w' // 최근 1주일 이내 기사만
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

  // 최근 7일 이내 기사만 필터링 (더 신선한 뉴스)
  const recent = filterRecentArticles(articles, 7)
  // 7일 필터로 너무 적으면 14일로 확장
  const finalArticles = recent.length >= 5 ? recent : filterRecentArticles(articles, 14)

  // 최신순 정렬 (가장 최근 기사가 위로)
  finalArticles.sort((a, b) => {
    const dateA = parseArticleDate(a.date)
    const dateB = parseArticleDate(b.date)
    if (!dateA && !dateB) return 0
    if (!dateA) return 1
    if (!dateB) return -1
    return dateB.getTime() - dateA.getTime()
  })

  console.log(`[Serper] 최종 결과: ${finalArticles.length}건 (최신순)`)
  return finalArticles
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

  // 키워드 원본 + 다양한 변형으로 3회 검색
  const queries = [keyword, `${keyword} 최신 뉴스`, `${keyword} 논란 이슈`]

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

  // 최근 7일 → 14일 점진적 필터링
  const recent = filterRecentArticles(articles, 7)
  const finalArticles = recent.length >= 5 ? recent : filterRecentArticles(articles, 14)

  // 최신순 정렬
  finalArticles.sort((a, b) => {
    const dateA = parseArticleDate(a.date)
    const dateB = parseArticleDate(b.date)
    if (!dateA && !dateB) return 0
    if (!dateA) return 1
    if (!dateB) return -1
    return dateB.getTime() - dateA.getTime()
  })

  console.log(`[Serper] 키워드 검색 최종: ${finalArticles.length}건 (최신순)`)
  return finalArticles
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

  // 주제 추가검색은 14일 필터 (이미 선택된 주제이므로 약간 넓게)
  const recent = filterRecentArticles(articles, 14)
  console.log(`[Serper] 주제 추가검색 최종: ${recent.length}건 (14일 이내)`)
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

  // Serper Images API는 page 대신 num 오프셋으로 페이지네이션
  // page=1 → num개, page=2 → num*2개 요청 후 뒤쪽만 반환
  const totalNeeded = num * page
  console.log(`[Serper] Google 이미지 검색: "${query}" (page=${page}, total=${totalNeeded})`)

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
        num: totalNeeded
      })
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error(`[Serper] Images API error: ${response.status}`, body)
      throw new Error(`Serper Images API ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    const allImages: any[] = data.images || []

    // page에 해당하는 범위만 반환 (이전 페이지 이미지 제외)
    const startIdx = num * (page - 1)
    const pageImages = allImages.slice(startIdx, startIdx + num)

    console.log(`[Serper] Google 이미지 결과: 전체 ${allImages.length}건 → page ${page}: ${pageImages.length}건`)

    return pageImages.map((img) => ({
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
