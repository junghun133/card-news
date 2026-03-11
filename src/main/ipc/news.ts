import { ipcMain } from 'electron'

// Phase 4에서 실제 API 연동 예정. 현재는 더미 핸들러만 등록.
export function registerNewsHandlers(): void {
  ipcMain.handle('news:search', async (_event, _topic: string) => {
    // TODO: serper.ts + openai.ts 연동
    return { success: true, topics: [] }
  })

  ipcMain.handle('news:validate', async (_event, _topicId: string) => {
    // TODO: 교차검증 + 카드 JSON 생성
    return { success: true, cardData: null }
  })

  ipcMain.handle('images:search', async (_event, _query: string) => {
    // TODO: unsplash.ts 연동
    return { success: true, images: [] }
  })
}
