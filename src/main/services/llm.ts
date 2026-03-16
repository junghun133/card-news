import type { ArticleInput, SuggestTopicsResult, CardResult } from './llmPrompts'
import * as openai from './openai'
import * as gemini from './gemini'

type LlmProvider = 'openai' | 'gemini'

function getProvider(): LlmProvider {
  return (process.env.LLM_PROVIDER as LlmProvider) || 'openai'
}

function getModule() {
  const provider = getProvider()
  console.log(`[LLM] Using provider: ${provider}`)
  return provider === 'gemini' ? gemini : openai
}

export async function suggestTopics(
  articles: ArticleInput[],
  category: string
): Promise<SuggestTopicsResult> {
  return getModule().suggestTopics(articles, category)
}

export async function generateCardData(
  topic: string,
  articles: ArticleInput[]
): Promise<CardResult> {
  return getModule().generateCardData(topic, articles)
}

export async function generateCardDataFromVideo(
  videoInfo: { title: string; description: string; uploader: string; duration: number },
  userContext?: string
): Promise<CardResult> {
  // 영상 정보를 기사 형태로 변환하여 기존 카드 생성 로직 재사용
  const pseudoArticles: ArticleInput[] = [{
    title: videoInfo.title,
    snippet: videoInfo.description.slice(0, 500),
    fullText: videoInfo.description,
    source: videoInfo.uploader,
    url: '',
    date: ''
  }]

  if (userContext) {
    pseudoArticles.push({
      title: '사용자 제공 정보',
      snippet: userContext,
      fullText: userContext,
      source: '사용자',
      url: '',
      date: ''
    })
  }

  return getModule().generateCardData(videoInfo.title, pseudoArticles)
}

export async function generateCaption(
  cardData: { keyword: string; title: string; description: string },
  articles?: ArticleInput[]
): Promise<string> {
  return getModule().generateCaption(cardData, articles)
}
