import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFile } from 'fs/promises'
import { suggestTopics, generateCardData, generateCaption } from '../services/llm'
import { searchImages, searchImagesByCategory, searchDiverseImages } from '../services/unsplash'
import { searchNews as serperSearch, searchNewsByTopic, searchNewsByKeyword, searchVideos, searchGoogleImages } from '../services/serper'
import { searchNaverNewsByKeyword, searchNaverNewsByTopic } from '../services/naver'
import { enrichArticlesWithFullText } from '../services/articleFetcher'

/**
 * 카테고리 → 네이버 검색용 대표 키워드 매핑
 */
const NAVER_CATEGORY_KEYWORDS: Record<string, string> = {
  ai: 'AI 인공지능',
  tech: '반도체 IT 기술',
  stocks: '주식 코스피',
  economy: '경제 금리 환율',
  war: '전쟁 국제정세',
  society: '사회 이슈',
  science: '과학 연구'
}

type Article = { title: string; snippet: string; source: string; url: string; date: string; provider?: string }

/**
 * 두 기사 배열을 합산하고 제목 기준 중복 제거
 */
function mergeArticles(...arrays: Article[][]): Article[] {
  const seen = new Set<string>()
  const merged: Article[] = []

  for (const articles of arrays) {
    for (const article of articles) {
      if (seen.has(article.title)) continue
      seen.add(article.title)
      merged.push(article)
    }
  }

  return merged
}

export function registerNewsHandlers(): void {
  /**
   * 최신 뉴스 불러오기 → Serper로 실제 뉴스 수집 → OpenAI 주제 추천
   */
  ipcMain.handle('news:search', async (_event, category: string) => {
    try {
      // 1. Serper + Naver 병렬로 실제 뉴스 기사 수집
      const naverKeyword = NAVER_CATEGORY_KEYWORDS[category] || category
      const [serperArticles, naverArticles] = await Promise.allSettled([
        serperSearch(category),
        searchNaverNewsByKeyword(naverKeyword)
      ])

      const serperResult = serperArticles.status === 'fulfilled' ? serperArticles.value : []
      const naverResult = naverArticles.status === 'fulfilled' ? naverArticles.value : []

      console.log(`[News] 카테고리 "${category}" 수집: Serper ${serperResult.length}건 + Naver ${naverResult.length}건`)

      const articles = mergeArticles(serperResult, naverResult)
      console.log(`[News] 합산 (중복 제거): ${articles.length}건`)

      if (articles.length === 0) {
        return { success: false, error: '뉴스를 찾을 수 없습니다.' }
      }

      // 2. OpenAI로 수집된 기사 분석 → 주제 추천
      const { topics: topicResults, inputArticles } = await suggestTopics(articles, category)

      // 3. 각 주제에 관련 기사 매핑 (inputArticles = OpenAI에 전달된 셔플 배열 기준)
      const topics = topicResults.map((t: any) => {
        const indices: number[] = t.relatedArticleIndices || []
        const related =
          indices.length > 0
            ? indices
                .filter((idx: number) => idx >= 1 && idx <= inputArticles.length)
                .map((idx: number) => inputArticles[idx - 1])
            : inputArticles.slice(0, 3)

        return {
          id: `${t.category || category}-${t.id}-${Date.now()}`,
          category: t.category || category,
          title: t.title,
          summary: t.summary,
          interestScore: t.interestScore,
          sourceCount: t.sourceCount || related.length,
          relatedArticles: related
        }
      })

      // 인기도(interestScore) 내림차순 정렬
      topics.sort((a: any, b: any) => (b.interestScore || 0) - (a.interestScore || 0))

      return { success: true, topics }
    } catch (err: any) {
      console.error('News search error:', err)
      return { success: false, error: err.message }
    }
  })

  /**
   * 사용자 키워드로 뉴스 검색 → 주제 추천
   */
  ipcMain.handle('news:search-keyword', async (_event, keyword: string) => {
    try {
      if (!keyword?.trim()) {
        return { success: false, error: '검색어를 입력해주세요.' }
      }

      // Serper + Naver 병렬 키워드 검색
      const trimmed = keyword.trim()
      const [serperArticles, naverArticles] = await Promise.allSettled([
        searchNewsByKeyword(trimmed),
        searchNaverNewsByKeyword(trimmed)
      ])

      const serperResult = serperArticles.status === 'fulfilled' ? serperArticles.value : []
      const naverResult = naverArticles.status === 'fulfilled' ? naverArticles.value : []

      console.log(`[News] 키워드 "${trimmed}" 수집: Serper ${serperResult.length}건 + Naver ${naverResult.length}건`)

      const articles = mergeArticles(serperResult, naverResult)
      console.log(`[News] 합산 (중복 제거): ${articles.length}건`)

      if (articles.length === 0) {
        return { success: false, error: `"${keyword}" 관련 뉴스를 찾을 수 없습니다.` }
      }

      // OpenAI로 주제 추천 (카테고리는 'all'로 처리)
      const { topics: topicResults, inputArticles } = await suggestTopics(articles, 'all')

      if (topicResults.length === 0) {
        return { success: false, error: `"${keyword}" 관련 주제를 생성할 수 없습니다.` }
      }

      // 각 주제에 관련 기사 매핑 (inputArticles = OpenAI에 전달된 셔플 배열 기준)
      const topics = topicResults.map((t: any) => {
        const indices: number[] = t.relatedArticleIndices || []
        const related =
          indices.length > 0
            ? indices
                .filter((idx: number) => idx >= 1 && idx <= inputArticles.length)
                .map((idx: number) => inputArticles[idx - 1])
            : inputArticles.slice(0, 5)

        return {
          id: `keyword-${t.id}-${Date.now()}`,
          category: t.category || 'society',
          title: t.title,
          summary: t.summary,
          interestScore: t.interestScore,
          sourceCount: t.sourceCount || related.length,
          relatedArticles: related
        }
      })

      topics.sort((a: any, b: any) => (b.interestScore || 0) - (a.interestScore || 0))

      return { success: true, topics }
    } catch (err: any) {
      console.error('Keyword search error:', err)
      return { success: false, error: err.message }
    }
  })

  /**
   * 선택한 주제를 교차검증하여 카드 데이터 생성 (5~8장 슬라이드)
   */
  ipcMain.handle('news:validate', async (event, topic: any) => {
    // 진행 상태를 렌더러에 실시간 전달
    const sender = event.sender
    const sendProgress = (step: string, percent: number) => {
      try { sender.send('news:validate-progress', step, percent) } catch { /* destroyed */ }
    }

    try {
      // Step 1: 추가 기사 검색
      sendProgress('관련 기사를 추가 검색하고 있어요...', 10)
      const existingArticles = topic.relatedArticles || []
      let enrichedArticles = [...existingArticles]

      try {
        const [serperAdditional, naverAdditional] = await Promise.allSettled([
          searchNewsByTopic(topic.title),
          searchNaverNewsByTopic(topic.title)
        ])

        const serperResult = serperAdditional.status === 'fulfilled' ? serperAdditional.value : []
        const naverResult = naverAdditional.status === 'fulfilled' ? naverAdditional.value : []

        console.log(`[News] 주제 "${topic.title}" 추가검색: Serper ${serperResult.length}건 + Naver ${naverResult.length}건`)

        const existingTitles = new Set(existingArticles.map((a: any) => a.title))
        const additionalArticles = mergeArticles(serperResult, naverResult)
        const newArticles = additionalArticles.filter((a) => !existingTitles.has(a.title))
        enrichedArticles = [...existingArticles, ...newArticles]
        console.log(`[News] 기사 보강: 기존 ${existingArticles.length}건 + 추가 ${newArticles.length}건 = 총 ${enrichedArticles.length}건`)
      } catch (err) {
        console.warn('[News] 추가 검색 실패, 기존 기사로 진행:', err)
      }

      // Step 2: 기사 본문 크롤링
      sendProgress('기사 본문을 수집하고 있어요...', 25)
      const articlesWithFullText = await enrichArticlesWithFullText(enrichedArticles, 5)

      // Step 3: AI 카드 생성
      sendProgress('AI가 카드뉴스를 생성하고 있어요...', 40)
      const cardResult = await generateCardData(topic.title, articlesWithFullText)

      // 슬라이드별 이미지 쿼리 추출
      const slideImageQueries = cardResult.slides.map(
        (s: any) => s.slideImageQuery || ''
      )

      const firstSlide = cardResult.slides[0] || { keyword: topic.title, title: '', description: '' }

      // Step 4: 이미지 검색 + 캡션 생성 병렬
      sendProgress('배경 이미지와 캡션을 준비하고 있어요...', 70)
      let diverseImages: any[] = []
      let caption = ''

      const [imageResult, captionResult] = await Promise.allSettled([
        searchDiverseImages(topic.category, slideImageQueries, cardResult.imageKeywords),
        generateCaption(
          {
            keyword: firstSlide.keyword,
            title: firstSlide.title,
            description: cardResult.slides.map((s) => s.description).filter(Boolean).join(' ')
          },
          articlesWithFullText
        )
      ])

      if (imageResult.status === 'fulfilled') diverseImages = imageResult.value
      if (captionResult.status === 'fulfilled') caption = captionResult.value

      // Step 5: 최종 조립
      sendProgress('카드를 조립하고 있어요...', 90)

      // slides 배열을 CardData 형태로 변환 — 슬라이드별 다른 이미지 배정
      const contentSlides = cardResult.slides.map((slide, i) => ({
        keyword: slide.keyword,
        title: slide.title,
        description: slide.description,
        source: i === cardResult.slides.length - 1 ? cardResult.sourceAttribution : '',
        hashtags: i === cardResult.slides.length - 1 ? cardResult.hashtags : [],
        backgroundImageUrl: diverseImages[i]?.url || diverseImages[0]?.url || null,
        caption: i === 0 ? caption : '',
        imageSearchQuery: slide.slideImageQuery || ''
      }))

      // 마지막에 프로필 소개 카드 자동 추가
      const profileCard = {
        keyword: '',
        title: '',
        description: '',
        source: '',
        hashtags: [],
        backgroundImageUrl: diverseImages[0]?.url || null,
        caption: '',
        isProfileCard: true
      }

      const slides = [...contentSlides, profileCard]

      sendProgress('카드 생성 완료!', 100)

      return {
        success: true,
        slides,
        images: diverseImages
      }
    } catch (err: any) {
      console.error('Validate error:', err)
      sendProgress('', 0)
      return { success: false, error: err.message }
    }
  })

  /**
   * Unsplash 이미지 검색
   */
  ipcMain.handle('images:search', async (_event, query: string) => {
    try {
      const images = await searchImages(query)
      return { success: true, images }
    } catch (err: any) {
      console.error('Image search error:', err)
      return { success: false, error: err.message }
    }
  })

  /**
   * Google 이미지 검색 (Serper Images API)
   */
  ipcMain.handle('images:search-google', async (_event, query: string, page = 1) => {
    try {
      const images = await searchGoogleImages(query, 9, page)
      return { success: true, images }
    } catch (err: any) {
      console.error('Google image search error:', err)
      return { success: false, error: err.message, images: [] }
    }
  })

  /**
   * 로컬 이미지 파일 업로드 → data URL 반환
   */
  ipcMain.handle('images:upload-local', async (_event) => {
    try {
      const win = BrowserWindow.getFocusedWindow()
      const result = await dialog.showOpenDialog(win!, {
        title: '배경 이미지 선택',
        filters: [
          { name: '이미지', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }
        ],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, reason: 'canceled' }
      }

      const filePath = result.filePaths[0]
      const buffer = await readFile(filePath)
      const ext = filePath.split('.').pop()?.toLowerCase() || 'png'
      const mimeMap: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        gif: 'image/gif',
        bmp: 'image/bmp'
      }
      const mime = mimeMap[ext] || 'image/png'
      const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`

      return { success: true, dataUrl }
    } catch (err: any) {
      console.error('Image upload error:', err)
      return { success: false, error: err.message }
    }
  })

  /**
   * 외부 이미지 URL → data URL 프록시 (CORS 우회)
   */
  ipcMain.handle('images:proxy', async (_event, imageUrl: string) => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`Image fetch failed: ${response.status}`)
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`

      return { success: true, dataUrl }
    } catch (err: any) {
      console.error('[ImageProxy] Failed:', err.message)
      return { success: false, error: err.message }
    }
  })

  /**
   * 관련 짧은 영상 검색 (1분 이하)
   */
  ipcMain.handle('videos:search', async (_event, query: string) => {
    try {
      const videos = await searchVideos(query)
      return { success: true, videos }
    } catch (err: any) {
      console.error('Video search error:', err)
      return { success: false, error: err.message, videos: [] }
    }
  })

  /**
   * 캡션 생성
   */
  ipcMain.handle('news:caption', async (_event, cardData: any) => {
    try {
      const caption = await generateCaption(cardData)
      return { success: true, caption }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
