import OpenAI from 'openai'
import dotenv from 'dotenv'
import { join } from 'path'
import { app } from 'electron'

// .env 로드 (개발 시 프로젝트 루트, 프로덕션 시 app 경로)
dotenv.config({ path: join(process.cwd(), '.env') })

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.')
  return new OpenAI({ apiKey })
}

interface ArticleInput {
  title: string
  snippet: string
  source: string
  url: string
  date: string
}

interface TopicResult {
  id: string
  category: 'ai' | 'stocks' | 'war'
  title: string
  summary: string
  interestScore: number
  sourceCount: number
}

interface CardResult {
  keyword: string
  title: string
  description: string
  sourceAttribution: string
  hashtags: string[]
  imageKeywords: string[]
}

/**
 * 뉴스 기사 목록에서 흥미로운 주제를 추천
 */
export async function suggestTopics(
  articles: ArticleInput[],
  category: string
): Promise<TopicResult[]> {
  const client = getClient()

  const articlesText = articles
    .map(
      (a, i) =>
        `[${i + 1}] ${a.source} (${a.date})\n제목: ${a.title}\n내용: ${a.snippet}\nURL: ${a.url}`
    )
    .join('\n---\n')

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `너는 한국어 뉴스 분석가야. 주어진 뉴스 기사들을 분석하여 카드뉴스로 만들기 좋은 흥미로운 주제 3-5개를 추천해줘.

반드시 아래 JSON 형식으로만 응답해:
{
  "topics": [
    {
      "title": "주제 제목 (20자 이내, 임팩트 있게)",
      "summary": "한줄 요약 (50자 이내)",
      "interestScore": 0-100,
      "sourceCount": 관련 기사 수,
      "relatedArticleIndices": [1, 2, 3]
    }
  ]
}`
      },
      {
        role: 'user',
        content: `카테고리: ${category}\n\n기사 목록:\n${articlesText}`
      }
    ]
  })

  const content = response.choices[0]?.message?.content
  if (!content) return []

  const parsed = JSON.parse(content)
  return (parsed.topics || []).map((t: any, i: number) => ({
    id: `${category}-${i}`,
    category: category as 'ai' | 'stocks' | 'war',
    title: t.title,
    summary: t.summary,
    interestScore: t.interestScore || 80,
    sourceCount: t.sourceCount || 2
  }))
}

/**
 * 선택한 주제의 관련 기사들을 교차검증하여 카드 데이터 생성
 */
export async function generateCardData(
  topic: string,
  articles: ArticleInput[]
): Promise<CardResult> {
  const client = getClient()

  const articlesText = articles
    .map(
      (a, i) =>
        `[${i + 1}] ${a.source} (${a.date})\n제목: ${a.title}\n내용: ${a.snippet}`
    )
    .join('\n---\n')

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `너는 카드뉴스 콘텐츠 전문가야. 주어진 뉴스 기사들을 교차검증하여 카드뉴스용 콘텐츠를 만들어줘.

규칙:
1. 최소 2개 이상의 출처에서 확인된 사실만 포함
2. 구체적 수치(%, $, 날짜 등)를 반드시 포함
3. 한국어로 작성

반드시 아래 JSON 형식으로만 응답해:
{
  "keyword": "핵심 키워드 (1-4단어, 최대 임팩트)",
  "title": "카드 제목 (15자 이내)",
  "description": "본문 요약 (80자 이내, 검증된 사실만)",
  "sourceAttribution": "출처: 매체1, 매체2 종합",
  "hashtags": ["#키워드1", "#키워드2", ...],
  "imageKeywords": ["english_keyword1", "english_keyword2", "english_keyword3"]
}`
      },
      {
        role: 'user',
        content: `주제: ${topic}\n\n관련 기사:\n${articlesText}`
      }
    ]
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('OpenAI 응답이 비어있습니다.')

  return JSON.parse(content)
}

/**
 * 인스타그램 캡션 생성
 */
export async function generateCaption(cardData: {
  keyword: string
  title: string
  description: string
}): Promise<string> {
  const client = getClient()

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `인스타그램 카드뉴스 게시글의 캡션을 한국어로 작성해줘.
구성: 짧은 설명 (2-3문장) + 빈 줄 + 해시태그 10-15개 (한국어+영어 혼합).
이모지는 최소한으로 사용.`
      },
      {
        role: 'user',
        content: `키워드: ${cardData.keyword}\n제목: ${cardData.title}\n설명: ${cardData.description}`
      }
    ]
  })

  return response.choices[0]?.message?.content || ''
}
