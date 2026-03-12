import OpenAI from 'openai'

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

  // 토큰 절약: 상위 10개만, snippet 100자 제한, URL 제외
  const trimmed = articles.slice(0, 10)
  const articlesText = trimmed
    .map(
      (a, i) =>
        `[${i + 1}] ${a.source} (${a.date})\n제목: ${a.title}\n내용: ${a.snippet.slice(0, 100)}`
    )
    .join('\n---\n')

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `너는 한국어 뉴스 분석가야. 주어진 뉴스 기사들을 분석하여 카드뉴스로 만들기 좋은 흥미로운 주제 3-5개를 추천해줘.

**인기도 평가 기준** (interestScore에 반영):
1. 여러 매체에서 동시에 다루는 주제일수록 높은 점수 (다수 매체 보도 = 대중 관심 높음)
2. 구체적 수치/데이터가 포함된 기사일수록 높은 점수
3. 사회적 파급력이 큰 주제 (경제영향, 정책변화, 기술혁신 등) 우선
4. 최신 기사(오늘/어제)가 과거 기사보다 높은 점수

반드시 interestScore가 높은 순서대로 정렬하여 응답해.

반드시 아래 JSON 형식으로만 응답해:
{
  "topics": [
    {
      "title": "주제 제목 (20자 이내, 임팩트 있게)",
      "summary": "한줄 요약 (50자 이내)",
      "interestScore": 0-100,
      "sourceCount": 관련 기사 수,
      "relatedArticleIndices": [1, 2, 3],
      "category": "ai|stocks|war"
    }
  ]
}
category는 반드시 ai, stocks, war 중 하나로 분류해줘.`
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
    category: (t.category || category) as 'ai' | 'stocks' | 'war',
    title: t.title,
    summary: t.summary,
    interestScore: t.interestScore || 80,
    sourceCount: t.sourceCount || 2,
    relatedArticleIndices: t.relatedArticleIndices || []
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

  // 토큰 절약: snippet 150자 제한
  const articlesText = articles
    .map(
      (a, i) =>
        `[${i + 1}] ${a.source} (${a.date})\n제목: ${a.title}\n내용: ${a.snippet.slice(0, 150)}`
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
