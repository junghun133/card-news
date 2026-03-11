import { ipcMain } from 'electron'
import { generateCardData, generateCaption } from '../services/openai'
import { searchImages, searchImagesByCategory } from '../services/unsplash'
import OpenAI from 'openai'
import dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env') })

export function registerNewsHandlers(): void {
  /**
   * 최신 뉴스 불러오기 → 주제 추천
   * OpenAI에게 최신 트렌드 기반 주제를 요청
   */
  ipcMain.handle('news:search', async (_event, category: string) => {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

      const catLabel =
        category === 'ai'
          ? 'AI/인공지능'
          : category === 'stocks'
            ? '주식/금융'
            : category === 'war'
              ? '전쟁/국제정세'
              : 'AI, 주식, 전쟁/국제정세'

      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `너는 최신 뉴스 트렌드에 정통한 한국어 뉴스 큐레이터야.
${catLabel} 분야에서 현재 가장 핫한 뉴스 주제 5개를 추천해줘.
각 주제에 대해 구체적인 수치와 출처를 포함해서 작성해.

반드시 아래 JSON 형식으로 응답해:
{
  "topics": [
    {
      "category": "ai" | "stocks" | "war",
      "title": "주제 제목 (20자 이내)",
      "summary": "한줄 요약 (구체적 수치 포함, 60자 이내)",
      "interestScore": 80-98,
      "sourceCount": 2-5,
      "relatedArticles": [
        { "title": "기사 제목", "snippet": "기사 요약", "source": "매체명", "url": "#", "date": "2026-03-11" }
      ]
    }
  ]
}`
          },
          {
            role: 'user',
            content: `${catLabel} 분야의 최신 핫 뉴스 주제 5개를 추천해줘. 가능하면 최근 기준으로 가장 화제가 되는 내용으로.`
          }
        ]
      })

      const content = response.choices[0]?.message?.content
      if (!content) return { success: false, error: 'OpenAI 응답이 비어있습니다.' }

      const parsed = JSON.parse(content)
      const topics = (parsed.topics || []).map((t: any, i: number) => ({
        ...t,
        id: `${t.category || category}-${i}-${Date.now()}`
      }))

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
