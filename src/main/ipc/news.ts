import { ipcMain } from 'electron'
import { suggestTopics, generateCardData, generateCaption } from '../services/openai'
import { searchImages, searchImagesByCategory } from '../services/unsplash'
import { searchNews as serperSearch } from '../services/serper'

export function registerNewsHandlers(): void {
  /**
   * 최신 뉴스 불러오기 → Serper로 실제 뉴스 수집 → OpenAI 주제 추천
   */
  ipcMain.handle('news:search', async (_event, category: string) => {
    try {
      // 1. Serper로 실제 뉴스 기사 수집
      const articles = await serperSearch(category)
      if (articles.length === 0) {
        return { success: false, error: '뉴스를 찾을 수 없습니다.' }
      }

      // 2. OpenAI로 수집된 기사 분석 → 주제 추천
      const topicResults = await suggestTopics(articles, category === 'all' ? 'ai' : category)

      // 3. 각 주제에 관련 기사 매핑
      const topics = topicResults.map((t: any) => {
        // relatedArticleIndices가 있으면 해당 기사 매핑, 없으면 상위 3개
        const indices: number[] = t.relatedArticleIndices || []
        const related =
          indices.length > 0
            ? indices
                .filter((idx: number) => idx >= 1 && idx <= articles.length)
                .map((idx: number) => articles[idx - 1])
            : articles.slice(0, 3)

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
   * 선택한 주제를 교차검증하여 카드 데이터 생성
   */
  ipcMain.handle('news:validate', async (_event, topic: any) => {
    try {
      const cardData = await generateCardData(topic.title, topic.relatedArticles || [])

      // 이미지 검색과 캡션 생성을 병렬로 처리
      let images: any[] = []
      let caption = ''

      const [imageResult, captionResult] = await Promise.allSettled([
        searchImagesByCategory(topic.category, cardData.imageKeywords),
        generateCaption({
          keyword: cardData.keyword,
          title: cardData.title,
          description: cardData.description
        })
      ])

      if (imageResult.status === 'fulfilled') images = imageResult.value
      if (captionResult.status === 'fulfilled') caption = captionResult.value

      return {
        success: true,
        cardData: {
          keyword: cardData.keyword,
          title: cardData.title,
          description: cardData.description,
          source: cardData.sourceAttribution,
          hashtags: cardData.hashtags,
          backgroundImageUrl: images[0]?.url || null,
          caption
        },
        images
      }
    } catch (err: any) {
      console.error('Validate error:', err)
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
