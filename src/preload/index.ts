import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // 뉴스 검색
  searchNews: (category: string) => ipcRenderer.invoke('news:search', category),
  searchNewsByKeyword: (keyword: string) => ipcRenderer.invoke('news:search-keyword', keyword),
  validateNews: (topic: any) => ipcRenderer.invoke('news:validate', topic),
  generateCaption: (cardData: any) => ipcRenderer.invoke('news:caption', cardData),

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

  // 설정
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: Record<string, string>) => ipcRenderer.invoke('settings:set', settings),
  validateSettings: () => ipcRenderer.invoke('settings:validate')
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
