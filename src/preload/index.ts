import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // 뉴스 검색
  searchNews: (category: string) => ipcRenderer.invoke('news:search', category),
  searchNewsByKeyword: (keyword: string) => ipcRenderer.invoke('news:search-keyword', keyword),
  validateNews: (topic: any) => ipcRenderer.invoke('news:validate', topic),
  generateCaption: (cardData: any) => ipcRenderer.invoke('news:caption', cardData),
  onValidateProgress: (callback: (step: string, percent: number) => void) => {
    const handler = (_e: any, step: string, percent: number) => callback(step, percent)
    ipcRenderer.on('news:validate-progress', handler)
    return () => ipcRenderer.removeListener('news:validate-progress', handler)
  },

  // 이미지 검색
  searchImages: (query: string) => ipcRenderer.invoke('images:search', query),
  searchGoogleImages: (query: string, page?: number) => ipcRenderer.invoke('images:search-google', query, page || 1),
  uploadLocalImage: () => ipcRenderer.invoke('images:upload-local'),

  // 이미지 프록시 (CORS 우회)
  proxyImage: (imageUrl: string) => ipcRenderer.invoke('images:proxy', imageUrl),

  // 영상 검색
  searchVideos: (query: string) => ipcRenderer.invoke('videos:search', query),

  // 내보내기
  saveImage: (dataUrl: string) => ipcRenderer.invoke('export:save', dataUrl),
  saveAllImages: (dataUrls: string[]) => ipcRenderer.invoke('export:save-all', dataUrls),

  // 카드 영상
  exportVideo: (options: any) => ipcRenderer.invoke('export:video', options),
  exportVideoFromSource: (options: any) => ipcRenderer.invoke('export:video-from-source', options),
  generateCardsFromVideo: (options: any) => ipcRenderer.invoke('video:generate-cards', options),
  createCompositeVideo: (options: any) => ipcRenderer.invoke('video:create-composite', options),
  captureVideoFrame: (options: any) => ipcRenderer.invoke('video:capture-frame', options),
  createOverlayVideo: (options: any) => ipcRenderer.invoke('video:create-overlay', options),
  extractSubtitles: (options: any) => ipcRenderer.invoke('video:extract-subtitles', options),
  translateSubtitles: (options: any) => ipcRenderer.invoke('video:translate-subtitles', options),
  createSubtitleVideo: (options: any) => ipcRenderer.invoke('video:create-subtitle-video', options),
  selectBgm: () => ipcRenderer.invoke('export:select-bgm'),
  selectVideo: () => ipcRenderer.invoke('export:select-video'),
  onVideoProgress: (callback: (step: string, percent: number) => void) => {
    const handler = (_e: any, step: string, percent: number) => callback(step, percent)
    ipcRenderer.on('export:video-progress', handler)
    return () => ipcRenderer.removeListener('export:video-progress', handler)
  },

  // 설정
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: Record<string, string>) => ipcRenderer.invoke('settings:set', settings),
  validateSettings: () => ipcRenderer.invoke('settings:validate')
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
