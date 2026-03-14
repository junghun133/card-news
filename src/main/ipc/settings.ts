import { ipcMain } from 'electron'
import Store from 'electron-store'

interface AppSettings {
  serperApiKey: string
  openaiApiKey: string
  unsplashAccessKey: string
  naverClientId: string
  naverClientSecret: string
  geminiApiKey: string
  llmProvider: string
}

const store = new Store<AppSettings>({
  name: 'config',
  projectName: 'card-news',
  defaults: {
    serperApiKey: '',
    openaiApiKey: '',
    unsplashAccessKey: '',
    naverClientId: '',
    naverClientSecret: '',
    geminiApiKey: '',
    llmProvider: 'openai'
  }
})

export function registerSettingsHandlers(): void {
  // 앱 시작 시 저장된 API 키를 환경변수로 로드 (trim 적용 + 재저장)
  const rawSerper = store.get('serperApiKey') || ''
  const rawOpenai = store.get('openaiApiKey') || ''
  const rawUnsplash = store.get('unsplashAccessKey') || ''
  const rawNaverId = store.get('naverClientId') || ''
  const rawNaverSecret = store.get('naverClientSecret') || ''
  const rawGemini = store.get('geminiApiKey') || ''
  const rawLlmProvider = store.get('llmProvider') || 'openai'
  const savedSerper = rawSerper.trim()
  const savedOpenai = rawOpenai.trim()
  const savedUnsplash = rawUnsplash.trim()
  const savedNaverId = rawNaverId.trim()
  const savedNaverSecret = rawNaverSecret.trim()
  const savedGemini = rawGemini.trim()
  const savedLlmProvider = rawLlmProvider.trim()

  // 공백이 포함되어 있었으면 trim된 값으로 재저장
  if (rawSerper !== savedSerper) store.set('serperApiKey', savedSerper)
  if (rawOpenai !== savedOpenai) store.set('openaiApiKey', savedOpenai)
  if (rawUnsplash !== savedUnsplash) store.set('unsplashAccessKey', savedUnsplash)
  if (rawNaverId !== savedNaverId) store.set('naverClientId', savedNaverId)
  if (rawNaverSecret !== savedNaverSecret) store.set('naverClientSecret', savedNaverSecret)
  if (rawGemini !== savedGemini) store.set('geminiApiKey', savedGemini)

  if (savedSerper) process.env.SERPER_API_KEY = savedSerper
  if (savedOpenai) process.env.OPENAI_API_KEY = savedOpenai
  if (savedUnsplash) process.env.UNSPLASH_ACCESS_KEY = savedUnsplash
  if (savedNaverId) process.env.NAVER_CLIENT_ID = savedNaverId
  if (savedNaverSecret) process.env.NAVER_CLIENT_SECRET = savedNaverSecret
  if (savedGemini) process.env.GEMINI_API_KEY = savedGemini
  process.env.LLM_PROVIDER = savedLlmProvider || 'openai'

  const obfuscate = (s: string) => s ? `${s.slice(0, 4)}...${s.slice(-4)} (len=${s.length})` : 'empty'
  console.log('[Settings] API keys loaded:', {
    serper: obfuscate(savedSerper),
    openai: obfuscate(savedOpenai),
    unsplash: obfuscate(savedUnsplash),
    naverId: obfuscate(savedNaverId),
    naverSecret: obfuscate(savedNaverSecret),
    gemini: obfuscate(savedGemini),
    llmProvider: savedLlmProvider
  })

  ipcMain.handle('settings:get', () => {
    return {
      serperApiKey: store.get('serperApiKey'),
      openaiApiKey: store.get('openaiApiKey'),
      unsplashAccessKey: store.get('unsplashAccessKey'),
      naverClientId: store.get('naverClientId'),
      naverClientSecret: store.get('naverClientSecret'),
      geminiApiKey: store.get('geminiApiKey'),
      llmProvider: store.get('llmProvider')
    }
  })

  ipcMain.handle('settings:set', (_event, settings: Partial<AppSettings>) => {
    if (settings.serperApiKey !== undefined) {
      const key = settings.serperApiKey.trim()
      store.set('serperApiKey', key)
      process.env.SERPER_API_KEY = key
    }
    if (settings.openaiApiKey !== undefined) {
      const key = settings.openaiApiKey.trim()
      store.set('openaiApiKey', key)
      process.env.OPENAI_API_KEY = key
    }
    if (settings.unsplashAccessKey !== undefined) {
      const key = settings.unsplashAccessKey.trim()
      store.set('unsplashAccessKey', key)
      process.env.UNSPLASH_ACCESS_KEY = key
    }
    if (settings.naverClientId !== undefined) {
      const key = settings.naverClientId.trim()
      store.set('naverClientId', key)
      process.env.NAVER_CLIENT_ID = key
    }
    if (settings.naverClientSecret !== undefined) {
      const key = settings.naverClientSecret.trim()
      store.set('naverClientSecret', key)
      process.env.NAVER_CLIENT_SECRET = key
    }
    if (settings.geminiApiKey !== undefined) {
      const key = settings.geminiApiKey.trim()
      store.set('geminiApiKey', key)
      process.env.GEMINI_API_KEY = key
    }
    if (settings.llmProvider !== undefined) {
      const provider = settings.llmProvider.trim()
      store.set('llmProvider', provider)
      process.env.LLM_PROVIDER = provider
    }
    return { success: true }
  })

  ipcMain.handle('settings:validate', async () => {
    const result: Record<string, boolean> = { serper: false, openai: false, unsplash: false, naver: false, gemini: false }

    // Serper 검증
    const serperKey = process.env.SERPER_API_KEY?.trim()
    if (serperKey) {
      try {
        const res = await fetch('https://google.serper.dev/news', {
          method: 'POST',
          headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: 'test', num: 1 })
        })
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          console.error('[Settings] Serper validate failed:', res.status, body)
        }
        result.serper = res.ok
      } catch (e) {
        console.error('[Settings] Serper validate error:', e)
        result.serper = false
      }
    }

    // OpenAI 검증
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${openaiKey}` }
        })
        result.openai = res.ok
      } catch {
        result.openai = false
      }
    }

    // Unsplash 검증
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY
    if (unsplashKey) {
      try {
        const res = await fetch(
          `https://api.unsplash.com/search/photos?query=test&per_page=1`,
          { headers: { Authorization: `Client-ID ${unsplashKey}` } }
        )
        result.unsplash = res.ok
      } catch {
        result.unsplash = false
      }
    }

    // Naver 검증
    const naverId = process.env.NAVER_CLIENT_ID?.trim()
    const naverSecret = process.env.NAVER_CLIENT_SECRET?.trim()
    if (naverId && naverSecret) {
      try {
        const res = await fetch(
          `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent('테스트')}&display=1`,
          {
            headers: {
              'X-Naver-Client-Id': naverId,
              'X-Naver-Client-Secret': naverSecret
            }
          }
        )
        result.naver = res.ok
      } catch {
        result.naver = false
      }
    }

    // Gemini 검증 (REST API 직접 호출)
    const geminiKey = process.env.GEMINI_API_KEY?.trim()
    if (geminiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`,
          { method: 'GET' }
        )
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          console.error('[Settings] Gemini validate failed:', res.status, body)
        }
        result.gemini = res.ok
      } catch (e) {
        console.error('[Settings] Gemini validate error:', e)
        result.gemini = false
      }
    }

    return result
  })
}
