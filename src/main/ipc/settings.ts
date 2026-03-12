import { ipcMain } from 'electron'
import Store from 'electron-store'

interface AppSettings {
  serperApiKey: string
  openaiApiKey: string
  unsplashAccessKey: string
}

const store = new Store<AppSettings>({
  defaults: {
    serperApiKey: '',
    openaiApiKey: '',
    unsplashAccessKey: ''
  }
})

export function registerSettingsHandlers(): void {
  // 앱 시작 시 저장된 API 키를 환경변수로 로드
  const savedSerper = store.get('serperApiKey')
  const savedOpenai = store.get('openaiApiKey')
  const savedUnsplash = store.get('unsplashAccessKey')
  if (savedSerper) process.env.SERPER_API_KEY = savedSerper
  if (savedOpenai) process.env.OPENAI_API_KEY = savedOpenai
  if (savedUnsplash) process.env.UNSPLASH_ACCESS_KEY = savedUnsplash

  ipcMain.handle('settings:get', () => {
    return {
      serperApiKey: store.get('serperApiKey'),
      openaiApiKey: store.get('openaiApiKey'),
      unsplashAccessKey: store.get('unsplashAccessKey')
    }
  })

  ipcMain.handle('settings:set', (_event, settings: Partial<AppSettings>) => {
    if (settings.serperApiKey !== undefined) {
      store.set('serperApiKey', settings.serperApiKey)
      process.env.SERPER_API_KEY = settings.serperApiKey
    }
    if (settings.openaiApiKey !== undefined) {
      store.set('openaiApiKey', settings.openaiApiKey)
      process.env.OPENAI_API_KEY = settings.openaiApiKey
    }
    if (settings.unsplashAccessKey !== undefined) {
      store.set('unsplashAccessKey', settings.unsplashAccessKey)
      process.env.UNSPLASH_ACCESS_KEY = settings.unsplashAccessKey
    }
    return { success: true }
  })
}
