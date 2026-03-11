import { ipcMain, dialog } from 'electron'
import { writeFile } from 'fs/promises'

export function registerExportHandlers(): void {
  ipcMain.handle('export:save', async (_event, dataUrl: string) => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: '카드뉴스 이미지 저장',
      defaultPath: `card-news-${Date.now()}.png`,
      filters: [{ name: 'PNG Image', extensions: ['png'] }]
    })

    if (canceled || !filePath) return { success: false, reason: 'canceled' }

    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '')
    await writeFile(filePath, Buffer.from(base64Data, 'base64'))
    return { success: true, filePath }
  })
}
