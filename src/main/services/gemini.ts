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
