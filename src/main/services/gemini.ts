import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  type ArticleInput,
  type SuggestTopicsResult,
  type CardResult,
  prepareArticlesForTopics,
  buildArticlesText,
  buildNumbersHint,
  buildCardUserPrompt,
  buildCaptionUserPrompt,
  getSuggestTopicsSystemPrompt,
  getGenerateCardSystemPrompt,
  getGenerateCardFewShot,
  getGenerateCaptionSystemPrompt,
  parseSuggestTopicsResponse,
  parseCardDataResponse
} from './llmPrompts'

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.')
  return new GoogleGenerativeAI(apiKey)
}

/**
 * 뉴스 기사 목록에서 흥미로운 주제를 추천
 */
export async function suggestTopics(
  articles: ArticleInput[],
  category: string
): Promise<SuggestTopicsResult> {
  const client = getClient()
  const { trimmed, articlesText } = prepareArticlesForTopics(articles)

  const model = client.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: getSuggestTopicsSystemPrompt(),
    generationConfig: {
      responseMimeType: 'application/json'
    }
  })

  const result = await model.generateContent(
    `카테고리: ${category}\n\n기사 목록:\n${articlesText}`
  )

  const content = result.response.text()
  if (!content) return { topics: [], inputArticles: trimmed }

  const topics = parseSuggestTopicsResponse(content, category)
  return { topics, inputArticles: trimmed }
}

/**
 * 선택한 주제의 관련 기사들을 교차검증하여 5~8장 카드뉴스 슬라이드 생성
 */
export async function generateCardData(
  topic: string,
  articles: ArticleInput[]
): Promise<CardResult> {
  const client = getClient()

  const articlesText = buildArticlesText(articles)
  const numbersHint = buildNumbersHint(articles)
  const fewShot = getGenerateCardFewShot()

  const model = client.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: getGenerateCardSystemPrompt(),
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3
    }
  })

  // Few-shot을 multi-turn history로 전달
  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: fewShot.user }] },
      { role: 'model', parts: [{ text: fewShot.assistant }] }
    ]
  })

  const result = await chat.sendMessage(
    buildCardUserPrompt(topic, articlesText, numbersHint)
  )

  const content = result.response.text()
  if (!content) throw new Error('Gemini 응답이 비어있습니다.')

  return parseCardDataResponse(content, topic)
}

/**
 * 인스타그램 캡션 생성
 */
export async function generateCaption(
  cardData: { keyword: string; title: string; description: string },
  articles?: ArticleInput[]
): Promise<string> {
  const client = getClient()

  const model = client.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: getGenerateCaptionSystemPrompt()
  })

  const result = await model.generateContent(
    buildCaptionUserPrompt(cardData, articles)
  )

  return result.response.text() || ''
}

/**
 * 자막 배열을 한국어로 번역 (타임코드 유지, 텍스트만 번역)
 * 50개씩 배치 처리
 */
export async function translateSubtitles(
  entries: { index: number; startTime: string; endTime: string; text: string }[]
): Promise<{ index: number; text: string }[]> {
  const client = getClient()
  const model = client.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `너는 영상 자막 번역 전문가야. 아래 규칙을 따라 번역해:
1. 자연스러운 한국어 구어체로 번역 (방송 자막 톤)
2. 타임코드(index, startTime, endTime)는 절대 변경하지 마
3. text 필드만 한국어로 번역
4. 반드시 JSON 배열로 응답: [{"index": 1, "text": "번역된 텍스트"}, ...]
5. 짧은 자막은 짧게, 긴 자막은 적절히 번역
6. 고유명사(인명, 지명, 브랜드)는 원어 유지 또는 한국에서 통용되는 표기 사용`
  })

  const BATCH_SIZE = 50
  const results: { index: number; text: string }[] = []

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE)
    const input = batch.map(e => ({ index: e.index, text: e.text }))

    console.log(`[Gemini] Translating batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} entries`)

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text:
        `아래 자막을 한국어로 번역해줘. JSON 배열로만 응답:\n${JSON.stringify(input)}`
      }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    })

    const responseText = result.response.text() || '[]'
    try {
      const translated = JSON.parse(responseText)
      results.push(...translated)
    } catch {
      // JSON 파싱 실패 시 원본 유지
      console.warn('[Gemini] Translation JSON parse failed, keeping original')
      results.push(...input)
    }
  }

  return results
}
