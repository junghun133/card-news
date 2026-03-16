import { ipcMain, dialog, shell } from 'electron'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

/** 자동저장 기본 경로 */
const AUTO_SAVE_BASE = 'C:\\develop\\Project\\card-news\\output'

/** YYYY-MM-DD 형식 날짜 문자열 */
function getDateFolder(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 타임스탬프 (HHmmss) */
function getTimestamp(): string {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  return `${h}${min}${s}`
}

export function registerExportHandlers(): void {
  // 단일 카드 저장 (기존 다이얼로그 방식 유지, GIF 지원)
  ipcMain.handle('export:save', async (_event, dataUrl: string) => {
    const isGif = dataUrl.startsWith('data:image/gif')
    const ext = isGif ? 'gif' : 'png'
    const filterName = isGif ? 'GIF Image' : 'PNG Image'

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: '카드뉴스 이미지 저장',
      defaultPath: `card-news-${Date.now()}.${ext}`,
      filters: [{ name: filterName, extensions: [ext] }]
    })

    if (canceled || !filePath) return { success: false, reason: 'canceled' }

    const base64Data = dataUrl.replace(/^data:image\/(png|jpeg|gif);base64,/, '')
    await writeFile(filePath, Buffer.from(base64Data, 'base64'))
    return { success: true, filePath }
  })

  // 전체 카드 자동저장 → output/YYYY-MM-DD/card-news-HHmmss/
  ipcMain.handle('export:save-all', async (_event, dataUrls: string[]) => {
    try {
      const dateDir = join(AUTO_SAVE_BASE, getDateFolder())
      const subDir = join(dateDir, `card-news-${getTimestamp()}`)
      await mkdir(subDir, { recursive: true })

      for (let i = 0; i < dataUrls.length; i++) {
        const isGif = dataUrls[i].startsWith('data:image/gif')
        const ext = isGif ? 'gif' : 'png'
        const base64Data = dataUrls[i].replace(/^data:image\/(png|jpeg|gif);base64,/, '')
        const filePath = join(subDir, `card-${String(i + 1).padStart(2, '0')}.${ext}`)
        await writeFile(filePath, Buffer.from(base64Data, 'base64'))
      }

      // 저장된 폴더 열기
      shell.openPath(subDir)

      return { success: true, dir: subDir, count: dataUrls.length }
    } catch (err: any) {
      console.error('[Export] Auto-save error:', err)
      return { success: false, error: err.message }
    }
  })
}
