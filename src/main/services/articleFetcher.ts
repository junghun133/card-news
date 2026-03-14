/**
 * 기사 본문 크롤링 — Jina Reader API
 * https://r.jina.ai/{url} 로 기사 URL의 본문 텍스트를 추출
 */

interface ArticleInput {
  title: string
  snippet: string
  source: string
  url: string
  date: string
  provider?: string
  fullText?: string
}

/**
 * 동시 실행 개수 제한 헬퍼
 */
async function withConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length)
  let index = 0

  async function runNext(): Promise<void> {
    while (index < tasks.length) {
      const currentIndex = index++
      try {
        const value = await tasks[currentIndex]()
        results[currentIndex] = { status: 'fulfilled', value }
      } catch (reason: any) {
        results[currentIndex] = { status: 'rejected', reason }
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => runNext())
  await Promise.all(workers)
  return results
}

/**
 * Jina Reader API로 기사 본문 추출
 */
export async function fetchArticleFullText(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        Accept: 'text/plain',
        'X-Return-Format': 'text'
      },
      signal: controller.signal
    })

    if (!response.ok) {
      console.warn(`[ArticleFetcher] HTTP ${response.status} for ${url}`)
      return null
    }

    const text = await response.text()

    // 너무 짧으면 유효한 본문이 아닌 것으로 판단
    if (text.length < 100) {
      console.warn(`[ArticleFetcher] Too short (${text.length} chars) for ${url}`)
      return null
    }

    console.log(`[ArticleFetcher] Fetched ${text.length} chars from ${url}`)
    return text.slice(0, 5000) // 본문 최대 5000자
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn(`[ArticleFetcher] Timeout for ${url}`)
    } else {
      console.warn(`[ArticleFetcher] Error for ${url}: ${err.message}`)
    }
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * 상위 N개 기사의 본문을 병렬로 가져와 enrichment
 */
export async function enrichArticlesWithFullText(
  articles: ArticleInput[],
  maxArticles = 5
): Promise<ArticleInput[]> {
  const toFetch = articles.slice(0, maxArticles)
  const rest = articles.slice(maxArticles)

  console.log(`[ArticleFetcher] Fetching full text for ${toFetch.length} of ${articles.length} articles...`)

  const tasks = toFetch.map((article) => () => fetchArticleFullText(article.url))
  const results = await withConcurrencyLimit(tasks, 3)

  let successCount = 0
  const enriched = toFetch.map((article, i) => {
    const result = results[i]
    if (result.status === 'fulfilled' && result.value) {
      successCount++
      return { ...article, fullText: result.value }
    }
    return { ...article, fullText: '' }
  })

  console.log(`[ArticleFetcher] Fetched ${successCount}/${toFetch.length} articles successfully`)

  // 나머지 기사는 fullText 없이 그대로
  return [...enriched, ...rest.map((a) => ({ ...a, fullText: '' }))]
}
