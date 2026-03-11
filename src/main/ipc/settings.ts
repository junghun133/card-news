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
  ipcMain.handle('settings:get', () => {
    return {
      serperApiKey: store.get('serperApiKey'),
      openaiApiKey: store.get('openaiApiKey'),
      unsplashAccessKey: store.get('unsplashAccessKey')
    }
  })

  ipcMain.handle('settings:set', (_event, settings: Partial<AppSettings>) => {
    if (settings.serperApiKey !== undefined) store.set('serperApiKey', settings.serperApiKey)
    if (settings.openaiApiKey !== undefined) store.set('openaiApiKey', settings.openaiApiKey)
    if (settings.unsplashAccessKey !== undefined)
      store.set('unsplashAccessKey', settings.unsplashAccessKey)
    return { success: true }
  })
}
