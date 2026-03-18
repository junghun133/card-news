import { ipcMain, dialog, shell, app } from 'electron'
import { join, dirname } from 'path'
import { mkdir } from 'fs/promises'
import { saveFramesToTemp, encodeVideo, processVideoSource, composeVideoWithTextPanels, composeVideoWithOverlay, composeVideoWithSubtitles, generateAssContent, captureFrame, cleanupTemp } from '../services/videoExport'
import { downloadVideo, getVideoInfo, extractSubtitles } from '../services/videoDownload'
import { translateSubtitles } from '../services/llm'
import { writeFile } from 'fs/promises'
import { generateCardDataFromVideo, generateCaption } from '../services/llm'

/** 동적 출력 경로 (Documents/card-news-output) */
function getOutputBase(): string {
  return join(app.getPath('documents'), 'card-news-output')
}

function getDateFolder(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getTimestamp(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
}

export function registerVideoHandlers(): void {
  /**
   * 릴스 영상 생성 — 카드 이미지 슬라이드쇼 방식
   */
  ipcMain.handle('export:video', async (event, options: {
    dataUrls: string[]
    durationPerCard?: number
    transitionDuration?: number
    transitionType?: string
    aspectRatio?: '1:1' | '9:16'
    bgmPath?: string
    removeAudio?: boolean
  }) => {
    const sender = event.sender
    const sendProgress = (step: string, percent: number) => {
      try { sender.send('export:video-progress', step, percent) } catch { /* destroyed */ }
    }

    let tempDir = ''

    try {
      // Step 1: 프레임 저장
      sendProgress('카드 이미지를 준비하고 있어요...', 10)
      const { dir, paths } = await saveFramesToTemp(options.dataUrls)
      tempDir = dir
      console.log(`[Video] ${paths.length}장 프레임 저장 완료: ${dir}`)

      // Step 2: 출력 경로 생성
      const dateDir = join(getOutputBase(), getDateFolder())
      const subDir = join(dateDir, `reels-${getTimestamp()}`)
      await mkdir(subDir, { recursive: true })
      const outputPath = join(subDir, 'reels.mp4')

      // Step 3: FFmpeg 인코딩
      sendProgress('영상을 인코딩하고 있어요...', 20)
      await encodeVideo(
        {
          dataUrls: options.dataUrls,
          framePaths: paths,
          outputPath,
          durationPerCard: options.durationPerCard,
          transitionDuration: options.transitionDuration,
          transitionType: options.transitionType,
          aspectRatio: options.aspectRatio,
          bgmPath: options.removeAudio ? undefined : options.bgmPath,
          removeAudio: options.removeAudio
        },
        (percent) => {
          const adjusted = 20 + Math.round(percent * 0.75)
          sendProgress('영상을 인코딩하고 있어요...', adjusted)
        }
      )

      // Step 4: 완료
      sendProgress('영상 생성 완료!', 100)
      shell.openPath(subDir)

      return { success: true, dir: subDir, outputPath }
    } catch (err: any) {
      console.error('[Video] Export error:', err)
      sendProgress('', 0)
      return { success: false, error: err.message }
    } finally {
      if (tempDir) await cleanupTemp(tempDir)
    }
  })

  /**
   * 릴스 영상 생성 — 영상 소스 방식 (URL 다운로드 또는 로컬 파일)
   */
  ipcMain.handle('export:video-from-source', async (event, options: {
    videoUrl?: string
    localPath?: string
    aspectRatio?: '1:1' | '9:16'
    bgmPath?: string
  }) => {
    const sender = event.sender
    const sendProgress = (step: string, percent: number) => {
      try { sender.send('export:video-progress', step, percent) } catch { /* destroyed */ }
    }

    let tempDir = ''

    try {
      let inputPath = ''

      // Step 1: 영상 소스 확보
      if (options.videoUrl) {
        sendProgress('영상을 다운로드하고 있어요...', 5)
        const result = await downloadVideo(options.videoUrl, (pct) => {
          sendProgress('영상을 다운로드하고 있어요...', 5 + Math.round(pct * 0.4))
        })
        inputPath = result.filePath
        tempDir = dirname(result.filePath)
        console.log(`[Video] 다운로드 완료: ${inputPath}`)
      } else if (options.localPath) {
        inputPath = options.localPath
        sendProgress('영상을 준비하고 있어요...', 10)
      } else {
        return { success: false, error: '영상 소스가 없습니다.' }
      }

      // Step 2: 출력 경로 생성
      const dateDir = join(getOutputBase(), getDateFolder())
      const subDir = join(dateDir, `reels-${getTimestamp()}`)
      await mkdir(subDir, { recursive: true })
      const outputPath = join(subDir, 'reels.mp4')

      // Step 3: FFmpeg 변환 (리사이즈/크롭 + BGM)
      sendProgress('영상을 변환하고 있어요...', 50)
      await processVideoSource(
        {
          inputPath,
          outputPath,
          aspectRatio: options.aspectRatio,
          bgmPath: options.bgmPath
        },
        (percent) => {
          const adjusted = 50 + Math.round(percent * 0.45)
          sendProgress('영상을 변환하고 있어요...', adjusted)
        }
      )

      // Step 4: 완료
      sendProgress('영상 생성 완료!', 100)
      shell.openPath(subDir)

      return { success: true, dir: subDir, outputPath }
    } catch (err: any) {
      console.error('[Video] Source export error:', err)
      sendProgress('', 0)
      return { success: false, error: err.message }
    } finally {
      if (tempDir) await cleanupTemp(tempDir)
    }
  })

  /**
   * 합성 영상 생성 — 상단 영상 + 하단 텍스트 패널
   */
  ipcMain.handle('video:create-composite', async (event, options: {
    videoUrl?: string
    localVideoPath?: string
    textPanelDataUrls: string[]
    videoDuration: number
    startSec?: number
    bgmPath?: string
    removeAudio?: boolean
    watermarkDataUrl?: string
  }) => {
    const sender = event.sender
    const sendProgress = (step: string, percent: number) => {
      try { sender.send('export:video-progress', step, percent) } catch { /* destroyed */ }
    }

    let videoTempDir = ''
    let panelTempDir = ''

    try {
      let inputPath = ''

      // Step 1: 영상 소스 확보
      if (options.videoUrl) {
        sendProgress('영상을 다운로드하고 있어요...', 5)
        const result = await downloadVideo(options.videoUrl, (pct) => {
          sendProgress('영상을 다운로드하고 있어요...', 5 + Math.round(pct * 0.3))
        })
        inputPath = result.filePath
        videoTempDir = dirname(result.filePath)
        console.log(`[Video] 다운로드 완료: ${inputPath}`)
      } else if (options.localVideoPath) {
        inputPath = options.localVideoPath
        sendProgress('영상을 준비하고 있어요...', 10)
      } else {
        return { success: false, error: '영상 소스가 없습니다.' }
      }

      // Step 2: 텍스트 패널 PNG 저장
      sendProgress('텍스트 패널을 준비하고 있어요...', 35)
      const { dir: tDir, paths: panelPaths } = await saveFramesToTemp(options.textPanelDataUrls)
      panelTempDir = tDir
      console.log(`[Video] ${panelPaths.length}장 텍스트 패널 저장 완료`)

      // 워터마크 PNG 저장
      let watermarkPath: string | undefined
      if (options.watermarkDataUrl) {
        const { paths: wmPaths } = await saveFramesToTemp([options.watermarkDataUrl])
        watermarkPath = wmPaths[0]
        console.log(`[Video] 워터마크 PNG 저장 완료: ${watermarkPath}`)
      }

      // Step 3: 출력 경로 생성
      const dateDir = join(getOutputBase(), getDateFolder())
      const subDir = join(dateDir, `reels-${getTimestamp()}`)
      await mkdir(subDir, { recursive: true })
      const outputPath = join(subDir, 'reels.mp4')

      // Step 4: FFmpeg 합성 (영상 상단 + 텍스트 하단)
      sendProgress('영상을 합성하고 있어요...', 40)
      await composeVideoWithTextPanels(
        {
          videoPath: inputPath,
          textPanelPaths: panelPaths,
          outputPath,
          videoDuration: options.videoDuration,
          startSec: options.startSec || 0,
          bgmPath: options.removeAudio ? undefined : options.bgmPath,
          removeAudio: options.removeAudio,
          watermarkPath
        },
        (percent) => {
          const adjusted = 40 + Math.round(percent * 0.55)
          sendProgress('영상을 합성하고 있어요...', adjusted)
        }
      )

      // Step 5: 완료
      sendProgress('영상 생성 완료!', 100)
      shell.openPath(subDir)

      return { success: true, dir: subDir, outputPath }
    } catch (err: any) {
      console.error('[Video] Composite export error:', err)
      sendProgress('', 0)
      return { success: false, error: err.message }
    } finally {
      if (videoTempDir) await cleanupTemp(videoTempDir)
      if (panelTempDir) await cleanupTemp(panelTempDir)
    }
  })

  /**
   * BGM 파일 선택 다이얼로그
   */
  ipcMain.handle('export:select-bgm', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: '배경음악 선택',
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'aac', 'm4a'] }],
      properties: ['openFile']
    })
    if (canceled || filePaths.length === 0) return { success: false }
    return { success: true, filePath: filePaths[0] }
  })

  /**
   * 로컬 영상 파일 선택 다이얼로그
   */
  ipcMain.handle('export:select-video', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: '영상 파일 선택',
      filters: [{ name: 'Video', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }],
      properties: ['openFile']
    })
    if (canceled || filePaths.length === 0) return { success: false }
    return { success: true, filePath: filePaths[0] }
  })

  /**
   * 영상 URL → 메타데이터 추출 + LLM 카드뉴스 문구 생성
   */
  ipcMain.handle('video:generate-cards', async (event, options: {
    videoUrl: string
    userContext?: string
  }) => {
    console.log('[Video] video:generate-cards called with:', options.videoUrl)
    const sender = event.sender
    const sendProgress = (step: string, percent: number) => {
      try { sender.send('export:video-progress', step, percent) } catch { /* destroyed */ }
    }

    try {
      // Step 1: 영상 메타데이터 추출
      sendProgress('영상 정보를 가져오고 있어요...', 10)
      console.log('[Video] Calling getVideoInfo...')
      const videoInfo = await getVideoInfo(options.videoUrl)
      console.log('[Video] getVideoInfo result:', videoInfo.title)

      // Step 2: LLM으로 카드뉴스 생성
      sendProgress('AI가 카드뉴스 문구를 생성하고 있어요...', 40)
      const cardResult = await generateCardDataFromVideo(videoInfo, options.userContext)

      // Step 3: 캡션 생성
      sendProgress('캡션을 생성하고 있어요...', 75)
      const firstSlide = cardResult.slides[0]
      let caption = ''
      try {
        caption = await generateCaption({
          keyword: firstSlide?.keyword || videoInfo.title,
          title: firstSlide?.title || '',
          description: firstSlide?.description || ''
        })
      } catch (err) {
        console.warn('[Video] Caption generation failed:', err)
      }

      sendProgress('완료!', 100)

      return {
        success: true,
        videoInfo: {
          title: videoInfo.title,
          uploader: videoInfo.uploader,
          duration: videoInfo.duration
        },
        cardResult,
        caption
      }
    } catch (err: any) {
      console.error('[Video] Card generation error:', err)
      sendProgress('', 0)
      return { success: false, error: err.message }
    }
  })

  /**
   * 영상 프레임 캡처 (특정 시간의 프레임 → data URL)
   */
  ipcMain.handle('video:capture-frame', async (_event, options: {
    videoUrl?: string
    localVideoPath?: string
    timeSec: number
  }) => {
    try {
      let videoPath = options.localVideoPath || ''

      // URL인 경우 다운로드
      if (!videoPath && options.videoUrl) {
        const downloaded = await downloadVideo(options.videoUrl)
        videoPath = downloaded.filePath
      }

      if (!videoPath) {
        return { success: false, error: '영상 경로가 없습니다.' }
      }

      const buffer = await captureFrame(videoPath, options.timeSec)
      const dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`

      return { success: true, dataUrl }
    } catch (err: any) {
      console.error('[Video] Frame capture error:', err)
      return { success: false, error: err.message }
    }
  })

  /**
   * 전체 영상 + 텍스트 오버레이 합성 (9:16)
   */
  ipcMain.handle('video:create-overlay', async (event, options: {
    videoUrl?: string
    localVideoPath?: string
    overlayDataUrl: string
    videoDuration: number
    startSec?: number
    overlayDuration?: number
    bgmPath?: string
    removeAudio?: boolean
    watermarkDataUrl?: string
  }) => {
    const sender = event.sender
    const sendProgress = (step: string, percent: number) => {
      try { sender.send('export:video-progress', step, percent) } catch { /* destroyed */ }
    }

    try {
      sendProgress('영상 준비 중...', 5)

      // 영상 소스 확보
      let videoPath = options.localVideoPath || ''
      if (!videoPath && options.videoUrl) {
        sendProgress('영상 다운로드 중...', 10)
        const downloaded = await downloadVideo(options.videoUrl, (pct) => {
          sendProgress('영상 다운로드 중...', 10 + Math.round(pct * 0.25))
        })
        videoPath = downloaded.filePath
      }

      if (!videoPath) {
        return { success: false, error: '영상 소스가 없습니다.' }
      }

      // 오버레이 PNG 저장
      sendProgress('오버레이 준비 중...', 35)
      const overlayTemp = await saveFramesToTemp([options.overlayDataUrl])
      const overlayPath = overlayTemp.paths[0]

      // 워터마크 PNG 저장
      let watermarkPath: string | undefined
      if (options.watermarkDataUrl) {
        const wmTemp = await saveFramesToTemp([options.watermarkDataUrl])
        watermarkPath = wmTemp.paths[0]
      }

      // 출력 경로
      const dateFolder = getDateFolder()
      const outDir = join(getOutputBase(), dateFolder, `overlay-${getTimestamp()}`)
      await mkdir(outDir, { recursive: true })
      const outputPath = join(outDir, 'overlay-video.mp4')

      // FFmpeg 합성
      sendProgress('영상 합성 중...', 40)
      await composeVideoWithOverlay({
        videoPath,
        overlayPath,
        outputPath,
        videoDuration: options.videoDuration,
        startSec: options.startSec,
        overlayDuration: options.overlayDuration,
        bgmPath: options.removeAudio ? undefined : options.bgmPath,
        removeAudio: options.removeAudio,
        watermarkPath
      }, (pct) => {
        sendProgress('영상 합성 중...', 40 + Math.round(pct * 0.55))
      })

      sendProgress('완료!', 100)

      // 출력 폴더 열기
      shell.openPath(outDir)
      cleanupTemp(overlayTemp.dir)

      return { success: true, outputPath }
    } catch (err: any) {
      console.error('[Video] Overlay creation error:', err)
      sendProgress('', 0)
      return { success: false, error: err.message }
    }
  })

  /**
   * YouTube 영상에서 자막 추출
   */
  ipcMain.handle('video:extract-subtitles', async (_event, options: { videoUrl: string }) => {
    try {
      console.log('[Video] Extracting subtitles from:', options.videoUrl)
      const entries = await extractSubtitles(options.videoUrl)
      if (!entries || entries.length === 0) {
        return { success: false, error: '이 영상에는 자막이 없습니다.' }
      }
      return { success: true, entries }
    } catch (err: any) {
      console.error('[Video] Subtitle extraction error:', err)
      return { success: false, error: err.message }
    }
  })

  /**
   * 자막을 한국어로 번역 (Gemini)
   */
  ipcMain.handle('video:translate-subtitles', async (_event, options: {
    entries: { index: number; startTime: string; endTime: string; text: string }[]
  }) => {
    try {
      console.log(`[Video] Translating ${options.entries.length} subtitle entries`)
      const translated = await translateSubtitles(options.entries)
      return { success: true, translated }
    } catch (err: any) {
      console.error('[Video] Subtitle translation error:', err)
      return { success: false, error: err.message }
    }
  })

  /**
   * 전체 영상 + ASS 자막 번인 (9:16)
   */
  ipcMain.handle('video:create-subtitle-video', async (event, options: {
    videoUrl?: string
    localVideoPath?: string
    subtitles: { startSec: number; endSec: number; text: string }[]
    videoDuration: number
    startSec?: number
    bgmPath?: string
    removeAudio?: boolean
    watermarkDataUrl?: string
  }) => {
    const sender = event.sender
    const sendProgress = (step: string, percent: number) => {
      try { sender.send('export:video-progress', step, percent) } catch { /* destroyed */ }
    }

    try {
      sendProgress('영상 준비 중...', 5)

      // 영상 소스 확보
      let videoPath = options.localVideoPath || ''
      if (!videoPath && options.videoUrl) {
        sendProgress('영상 다운로드 중...', 10)
        const downloaded = await downloadVideo(options.videoUrl, (pct) => {
          sendProgress('영상 다운로드 중...', 10 + Math.round(pct * 0.25))
        })
        videoPath = downloaded.filePath
      }

      if (!videoPath) {
        return { success: false, error: '영상 소스가 없습니다.' }
      }

      // ASS 자막 파일 생성
      sendProgress('자막 파일 생성 중...', 35)
      const assContent = generateAssContent(
        options.subtitles,
        options.startSec || 0,
        (options.startSec || 0) + options.videoDuration
      )
      const assTemp = join(getOutputBase(), `temp-sub-${Date.now()}.ass`)
      await writeFile(assTemp, assContent, 'utf-8')

      // 워터마크 PNG 저장
      let watermarkPath: string | undefined
      if (options.watermarkDataUrl) {
        const wmTemp = await saveFramesToTemp([options.watermarkDataUrl])
        watermarkPath = wmTemp.paths[0]
      }

      // 출력 경로
      const dateFolder = getDateFolder()
      const outDir = join(getOutputBase(), dateFolder, `subtitle-${getTimestamp()}`)
      await mkdir(outDir, { recursive: true })
      const outputPath = join(outDir, 'subtitle-video.mp4')

      // FFmpeg 합성
      sendProgress('자막 영상 합성 중...', 40)
      await composeVideoWithSubtitles({
        videoPath,
        assPath: assTemp,
        outputPath,
        videoDuration: options.videoDuration,
        startSec: options.startSec,
        bgmPath: options.removeAudio ? undefined : options.bgmPath,
        removeAudio: options.removeAudio,
        watermarkPath
      }, (pct) => {
        sendProgress('자막 영상 합성 중...', 40 + Math.round(pct * 0.55))
      })

      sendProgress('완료!', 100)
      shell.openPath(outDir)

      // 임시 ASS 파일 정리
      try { await writeFile(assTemp, '') } catch { /* ignore */ }

      return { success: true, outputPath }
    } catch (err: any) {
      console.error('[Video] Subtitle video creation error:', err)
      sendProgress('', 0)
      return { success: false, error: err.message }
    }
  })
}
