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

export async function generateCaption(
  cardData: { keyword: string; title: string; description: string },
  articles?: ArticleInput[]
): Promise<string> {
  return getModule().generateCaption(cardData, articles)
}
