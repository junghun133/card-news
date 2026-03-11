import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // 뉴스 검색
  searchNews: (topic: string) => ipcRenderer.invoke('news:search', topic),
  validateNews: (topicId: string) => ipcRenderer.invoke('news:validate', topicId),

  // 이미지 검색
  searchImages: (query: string) => ipcRenderer.invoke('images:search', query),

  // 내보내기
  saveImage: (dataUrl: string) => ipcRenderer.invoke('export:save', dataUrl),

  // 설정
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: Record<string, string>) => ipcRenderer.invoke('settings:set', settings)
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
