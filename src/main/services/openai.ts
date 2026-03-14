import OpenAI from 'openai'
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

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.')
  return new OpenAI({ apiKey })
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

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: getSuggestTopicsSystemPrompt() },
      { role: 'user', content: `카테고리: ${category}\n\n기사 목록:\n${articlesText}` }
    ]
  })

  const content = response.choices[0]?.message?.content
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

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.3,
    messages: [
      { role: 'system', content: getGenerateCardSystemPrompt() },
      { role: 'user', content: fewShot.user },
      { role: 'assistant', content: fewShot.assistant },
      { role: 'user', content: buildCardUserPrompt(topic, articlesText, numbersHint) }
    ]
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('OpenAI 응답이 비어있습니다.')

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

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: getGenerateCaptionSystemPrompt() },
      { role: 'user', content: buildCaptionUserPrompt(cardData, articles) }
    ]
  })

  return response.choices[0]?.message?.content || ''
}
