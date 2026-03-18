import { writeFile, mkdir, rm, readdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawn, execFile } from 'child_process'

// ffmpeg-static은 바이너리 경로를 default export
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static')

/**
 * ffmpeg -i 로 오디오 스트림 존재 여부 확인
 */
function probeHasAudio(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-i', filePath, '-hide_banner'])
    let stderr = ''
    proc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    proc.on('close', () => {
      // "Stream #0:1: Audio:" 또는 "Stream #0:0(und): Audio:" 등의 패턴 확인
      const has = /Stream\s+#\d+:\d+.*Audio:/i.test(stderr)
      resolve(has)
    })
    proc.on('error', () => resolve(false))
  })
}

export interface VideoExportOptions {
  dataUrls: string[]
  outputPath: string
  durationPerCard?: number       // 기본 3초
  transitionDuration?: number    // 기본 0.5초
  transitionType?: string        // fade, dissolve, wipeleft 등
  aspectRatio?: '1:1' | '9:16'
  bgmPath?: string
  removeAudio?: boolean
}

/**
 * base64 data URL 배열 → temp 디렉토리에 PNG 파일 저장
 */
export async function saveFramesToTemp(dataUrls: string[]): Promise<{ dir: string; paths: string[] }> {
  const dir = join(tmpdir(), `card-news-video-${Date.now()}`)
  await mkdir(dir, { recursive: true })

  const paths: string[] = []
  for (let i = 0; i < dataUrls.length; i++) {
    const base64 = dataUrls[i].replace(/^data:image\/\w+;base64,/, '')
    const filePath = join(dir, `frame-${String(i + 1).padStart(2, '0')}.png`)
    await writeFile(filePath, Buffer.from(base64, 'base64'))
    paths.push(filePath)
  }

  return { dir, paths }
}

/**
 * FFmpeg로 이미지 시퀀스 → MP4 영상 생성
 */
export function encodeVideo(
  options: VideoExportOptions & { framePaths: string[] },
  onProgress?: (percent: number) => void
): Promise<void> {
  const {
    framePaths,
    outputPath,
    durationPerCard = 3,
    transitionDuration = 0.5,
    transitionType = 'fade',
    aspectRatio = '1:1',
    bgmPath,
    removeAudio
  } = options

  const n = framePaths.length
  if (n === 0) return Promise.reject(new Error('No frames'))

  // 총 영상 길이 계산
  const totalDuration = n * durationPerCard - (n - 1) * transitionDuration

  return new Promise((resolve, reject) => {
    const args: string[] = []

    // 입력: 각 프레임을 loop으로
    for (const fp of framePaths) {
      args.push('-loop', '1', '-t', String(durationPerCard), '-i', fp)
    }

    // BGM 입력
    if (bgmPath) {
      args.push('-i', bgmPath)
    }

    // 필터 체인 생성
    if (n === 1) {
      // 단일 프레임: 필터 불필요
      if (aspectRatio === '9:16') {
        args.push('-vf', 'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black')
      }
    } else {
      // xfade 체인
      const filters: string[] = []
      let lastLabel = '[0]'

      // 9:16이면 각 입력에 pad 적용
      if (aspectRatio === '9:16') {
        for (let i = 0; i < n; i++) {
          filters.push(`[${i}]pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black[p${i}]`)
        }
        lastLabel = '[p0]'

        for (let i = 1; i < n; i++) {
          const offset = i * durationPerCard - i * transitionDuration
          const outLabel = i < n - 1 ? `[v${i}]` : '[vout]'
          filters.push(
            `${lastLabel}[p${i}]xfade=transition=${transitionType}:duration=${transitionDuration}:offset=${offset.toFixed(2)}${outLabel}`
          )
          lastLabel = outLabel
        }
      } else {
        for (let i = 1; i < n; i++) {
          const offset = i * durationPerCard - i * transitionDuration
          const outLabel = i < n - 1 ? `[v${i}]` : '[vout]'
          filters.push(
            `${lastLabel}[${i}]xfade=transition=${transitionType}:duration=${transitionDuration}:offset=${offset.toFixed(2)}${outLabel}`
          )
          lastLabel = outLabel
        }
      }

      args.push('-filter_complex', filters.join(';'))
      args.push('-map', lastLabel)
    }

    // BGM 매핑
    if (removeAudio) {
      args.push('-an')
    } else if (bgmPath) {
      args.push('-map', `${n}:a`)
      args.push('-c:a', 'aac', '-b:a', '192k', '-shortest')
    }

    // 출력 설정
    args.push(
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      '-preset', 'fast',
      '-y',
      outputPath
    )

    console.log('[VideoExport] ffmpeg args:', args.join(' '))

    const proc = spawn(ffmpegPath, args)
    let stderr = ''

    proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderr += text

      // FFmpeg 진행률 파싱: time=00:00:05.23
      const match = text.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/)
      if (match && onProgress) {
        const secs = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3])
        const pct = Math.min(95, Math.round((secs / totalDuration) * 100))
        onProgress(pct)
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        onProgress?.(100)
        resolve()
      } else {
        reject(new Error(`FFmpeg exited with code ${code}\n${stderr.slice(-500)}`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`FFmpeg spawn error: ${err.message}`))
    })
  })
}

/**
 * 영상 소스 → 릴스용 MP4 변환
 * (리사이즈/크롭 + 선택적 BGM)
 */
export function processVideoSource(
  options: {
    inputPath: string
    outputPath: string
    aspectRatio?: '1:1' | '9:16'
    bgmPath?: string
  },
  onProgress?: (percent: number) => void
): Promise<void> {
  const { inputPath, outputPath, aspectRatio = '1:1', bgmPath } = options

  return new Promise((resolve, reject) => {
    // 먼저 duration을 파악하기 위해 probe
    const probeArgs = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      inputPath
    ]

    // ffprobe 대신 ffmpeg -i로 duration 파악 후 인코딩
    const args: string[] = ['-i', inputPath]

    // BGM 입력
    if (bgmPath) {
      args.push('-i', bgmPath)
    }

    // 비디오 필터: 리사이즈 + 센터크롭
    let vf: string
    if (aspectRatio === '9:16') {
      // 세로 영상: 1080x1920
      vf = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1'
    } else {
      // 정사각형: 1080x1080
      vf = 'scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,setsar=1'
    }
    args.push('-vf', vf)

    // 오디오 처리
    if (bgmPath) {
      // 원본 오디오 제거, BGM 사용
      args.push('-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest')
    } else {
      // 원본 오디오 유지 (있으면)
      args.push('-c:a', 'aac', '-b:a', '192k')
    }

    // 출력 설정
    args.push(
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      '-preset', 'fast',
      '-movflags', '+faststart',  // 인스타그램 호환
      '-y',
      outputPath
    )

    console.log('[VideoExport] processVideo ffmpeg args:', args.join(' '))

    const proc = spawn(ffmpegPath, args)
    let stderr = ''
    let totalDuration = 0

    proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderr += text

      // Duration 파싱: Duration: 00:01:23.45
      if (!totalDuration) {
        const durMatch = text.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
        if (durMatch) {
          totalDuration = parseInt(durMatch[1]) * 3600 + parseInt(durMatch[2]) * 60 + parseFloat(durMatch[3])
        }
      }

      // 진행률 파싱
      const match = text.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/)
      if (match && onProgress && totalDuration > 0) {
        const secs = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3])
        const pct = Math.min(95, Math.round((secs / totalDuration) * 100))
        onProgress(pct)
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        onProgress?.(100)
        resolve()
      } else {
        reject(new Error(`FFmpeg exited with code ${code}\n${stderr.slice(-500)}`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`FFmpeg spawn error: ${err.message}`))
    })
  })
}

/**
 * 합성 영상 생성 — 상단에 영상(60%), 하단에 텍스트 패널(40%)
 * 1080×1080 출력: 상단 648px 영상 + 하단 432px 텍스트 PNG (1장)
 */
export async function composeVideoWithTextPanels(
  options: {
    videoPath: string
    textPanelPaths: string[]
    outputPath: string
    videoDuration: number
    startSec?: number
    bgmPath?: string
    removeAudio?: boolean
    watermarkPath?: string
  },
  onProgress?: (percent: number) => void
): Promise<void> {
  const { videoPath, textPanelPaths, outputPath, videoDuration, startSec = 0, bgmPath, removeAudio, watermarkPath } = options
  if (textPanelPaths.length === 0) return Promise.reject(new Error('텍스트 패널이 없습니다'))

  const VIDEO_H = 648   // 60%
  const TEXT_H = 432     // 40%

  // 먼저 원본 영상에 오디오 스트림이 있는지 확인
  const hasAudio = await probeHasAudio(videoPath)
  console.log(`[VideoExport] Source video hasAudio: ${hasAudio}`)

  return new Promise((resolve, reject) => {
    const args: string[] = []

    // 입력 0: 소스 영상 (seek 없이 전체 입력)
    args.push('-i', videoPath)

    // 입력 1: 텍스트 패널 PNG (1장)
    args.push('-i', textPanelPaths[0])

    // 동적 입력 인덱스 관리
    let nextInputIdx = 2

    // BGM 입력
    let bgmInputIdx = -1
    if (bgmPath) {
      bgmInputIdx = nextInputIdx++
      args.push('-i', bgmPath)
    }

    // 워터마크 입력
    let wmInputIdx = -1
    if (watermarkPath) {
      wmInputIdx = nextInputIdx++
      args.push('-i', watermarkPath)
    }

    // 필터 체인 구성
    const filters: string[] = []

    // 비디오: trim으로 구간 자르기 → 스케일 → pad → 텍스트와 vstack
    if (startSec > 0) {
      filters.push(
        `[0:v]trim=start=${startSec}:duration=${videoDuration.toFixed(2)},setpts=PTS-STARTPTS,` +
        `scale=1080:${VIDEO_H}:force_original_aspect_ratio=decrease,` +
        `pad=1080:${VIDEO_H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1[vid]`
      )
    } else {
      filters.push(
        `[0:v]scale=1080:${VIDEO_H}:force_original_aspect_ratio=decrease,` +
        `pad=1080:${VIDEO_H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1[vid]`
      )
    }

    // 워터마크 오버레이 (영상 상단 좌측)
    if (watermarkPath) {
      filters.push(`[vid][${wmInputIdx}:v]overlay=27:20[vidwm]`)
      // 텍스트 패널 → 하단
      filters.push(`[1]scale=1080:${TEXT_H}[txt]`)
      filters.push('[vidwm][txt]vstack=inputs=2[vout]')
    } else {
      // 텍스트 패널 → 하단 432px
      filters.push(`[1]scale=1080:${TEXT_H}[txt]`)
      // 세로 스택 → 1080×1080
      filters.push('[vid][txt]vstack=inputs=2[vout]')
    }

    // 오디오 처리 — filter_complex 안에서 trim하여 비디오와 동기화
    if (removeAudio) {
      // 무음 — 오디오 스트림 제거
    } else if (bgmPath) {
      filters.push(`[${bgmInputIdx}:a]anull[aout]`)
    } else if (hasAudio) {
      if (startSec > 0) {
        filters.push(
          `[0:a]atrim=start=${startSec}:duration=${videoDuration.toFixed(2)},asetpts=PTS-STARTPTS[aout]`
        )
      } else {
        filters.push(`[0:a]anull[aout]`)
      }
    }

    args.push('-filter_complex', filters.join(';'))
    args.push('-map', '[vout]')

    if (removeAudio) {
      args.push('-an')
    } else if (bgmPath || hasAudio) {
      args.push('-map', '[aout]')
      args.push('-c:a', 'aac', '-b:a', '192k')
      if (bgmPath) {
        args.push('-shortest')
      }
    }

    // 출력 설정
    args.push(
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      '-preset', 'fast',
      '-movflags', '+faststart',
      '-t', videoDuration.toFixed(2),
      '-y',
      outputPath
    )

    console.log('[VideoExport] composite ffmpeg args:', args.join(' '))

    const proc = spawn(ffmpegPath, args)
    let stderr = ''

    proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderr += text

      // 진행률 파싱
      const match = text.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/)
      if (match && onProgress && videoDuration > 0) {
        const secs = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3])
        const pct = Math.min(95, Math.round((secs / videoDuration) * 100))
        onProgress(pct)
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        onProgress?.(100)
        resolve()
      } else {
        reject(new Error(`FFmpeg exited with code ${code}\n${stderr.slice(-500)}`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`FFmpeg spawn error: ${err.message}`))
    })
  })
}

/**
 * 전체 화면 영상 + 텍스트 오버레이 (2.5초 노출 후 사라짐) — 9:16 전용
 */
export async function composeVideoWithOverlay(
  options: {
    videoPath: string
    overlayPath: string         // 투명 PNG (1080×1920, 텍스트 박스만)
    outputPath: string
    videoDuration: number
    startSec?: number
    overlayDuration?: number    // 기본 2.5초
    bgmPath?: string
    removeAudio?: boolean
    watermarkPath?: string
  },
  onProgress?: (percent: number) => void
): Promise<void> {
  const {
    videoPath, overlayPath, outputPath, videoDuration,
    startSec = 0, overlayDuration = 2.5,
    bgmPath, removeAudio, watermarkPath
  } = options

  const hasAudio = await probeHasAudio(videoPath)
  console.log(`[VideoExport] overlay source hasAudio: ${hasAudio}`)

  return new Promise((resolve, reject) => {
    const args: string[] = []

    // 입력 0: 소스 영상
    args.push('-i', videoPath)

    // 입력 1: 텍스트 오버레이 PNG (투명 배경)
    args.push('-i', overlayPath)

    // 동적 입력 인덱스 관리
    let nextInputIdx = 2

    // BGM 입력
    let bgmInputIdx = -1
    if (bgmPath) {
      bgmInputIdx = nextInputIdx++
      args.push('-i', bgmPath)
    }

    // 워터마크 입력
    let wmInputIdx = -1
    if (watermarkPath) {
      wmInputIdx = nextInputIdx++
      args.push('-i', watermarkPath)
    }

    // 필터 체인 구성
    const filters: string[] = []

    // 영상: trim → 9:16 스케일/크롭
    if (startSec > 0) {
      filters.push(
        `[0:v]trim=start=${startSec}:duration=${videoDuration.toFixed(2)},setpts=PTS-STARTPTS,` +
        `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[vid]`
      )
    } else {
      filters.push(
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[vid]`
      )
    }

    // 오버레이 PNG (투명 배경) → format rgba
    filters.push(`[1:v]format=rgba[ovl]`)

    // 텍스트 오버레이: enable로 지정 시간만 표시
    const enableExpr = `enable='between(t,0,${overlayDuration.toFixed(2)})'`
    filters.push(`[vid][ovl]overlay=0:0:${enableExpr}[vidovl]`)

    // 워터마크 오버레이 (영상 좌상단)
    let finalVideo = 'vidovl'
    if (watermarkPath) {
      filters.push(`[${finalVideo}][${wmInputIdx}:v]overlay=27:20[vidwm]`)
      finalVideo = 'vidwm'
    }

    // 최종 출력 라벨
    if (finalVideo !== 'vout') {
      filters.push(`[${finalVideo}]null[vout]`)
    }

    // 오디오 처리
    if (removeAudio) {
      // 무음
    } else if (bgmPath) {
      filters.push(`[${bgmInputIdx}:a]anull[aout]`)
    } else if (hasAudio) {
      if (startSec > 0) {
        filters.push(
          `[0:a]atrim=start=${startSec}:duration=${videoDuration.toFixed(2)},asetpts=PTS-STARTPTS[aout]`
        )
      } else {
        filters.push(`[0:a]anull[aout]`)
      }
    }

    args.push('-filter_complex', filters.join(';'))
    args.push('-map', '[vout]')

    if (removeAudio) {
      args.push('-an')
    } else if (bgmPath || hasAudio) {
      args.push('-map', '[aout]')
      args.push('-c:a', 'aac', '-b:a', '192k')
      if (bgmPath) {
        args.push('-shortest')
      }
    }

    // 출력 설정
    args.push(
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      '-preset', 'fast',
      '-movflags', '+faststart',
      '-t', videoDuration.toFixed(2),
      '-y',
      outputPath
    )

    console.log('[VideoExport] overlay ffmpeg args:', args.join(' '))

    const proc = spawn(ffmpegPath, args)
    let stderr = ''

    proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderr += text

      const match = text.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/)
      if (match && onProgress && videoDuration > 0) {
        const secs = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3])
        const pct = Math.min(95, Math.round((secs / videoDuration) * 100))
        onProgress(pct)
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        onProgress?.(100)
        resolve()
      } else {
        reject(new Error(`FFmpeg exited with code ${code}\n${stderr.slice(-500)}`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`FFmpeg spawn error: ${err.message}`))
    })
  })
}

/**
 * 영상의 특정 시간 프레임을 캡처하여 JPEG 버퍼로 반환
 */
export function captureFrame(videoPath: string, timeSec: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const args = [
      '-ss', timeSec.toFixed(2),
      '-i', videoPath,
      '-frames:v', '1',
      '-f', 'image2',
      '-vcodec', 'mjpeg',
      '-q:v', '2',
      'pipe:1'
    ]

    const proc = spawn(ffmpegPath, args)
    const chunks: Buffer[] = []

    proc.stdout?.on('data', (chunk: Buffer) => chunks.push(chunk))

    proc.on('close', (code) => {
      if (code === 0 && chunks.length > 0) {
        resolve(Buffer.concat(chunks))
      } else {
        reject(new Error(`Frame capture failed (code ${code})`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`FFmpeg spawn error: ${err.message}`))
    })
  })
}

/**
 * SubtitleEntry 배열 → ASS 자막 파일 텍스트 생성
 * 유튜브 하단 중앙 스타일: 흰색 글씨 + 검은 외곽선 + 반투명 배경
 */
export function generateAssContent(
  entries: { startSec: number; endSec: number; text: string }[],
  trimStartSec = 0,
  trimEndSec = Infinity
): string {
  // ASS 타임코드 형식: H:MM:SS.CC
  const toAss = (sec: number): string => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`
  }

  const header = `[Script Info]
Title: Card News Subtitles
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Pretendard,46,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,40,40,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`

  const events = entries
    .filter(e => {
      // 트림 범위 내 자막만 포함
      const adjustedStart = e.startSec - trimStartSec
      const adjustedEnd = e.endSec - trimStartSec
      const trimDuration = trimEndSec - trimStartSec
      return adjustedEnd > 0 && adjustedStart < trimDuration
    })
    .map(e => {
      const start = Math.max(0, e.startSec - trimStartSec)
      const end = Math.min(trimEndSec - trimStartSec, e.endSec - trimStartSec)
      // ASS에서 줄바꿈은 \N
      const text = e.text.replace(/\n/g, '\\N')
      return `Dialogue: 0,${toAss(start)},${toAss(end)},Default,,0,0,0,,${text}`
    })
    .join('\n')

  return `${header}\n${events}\n`
}

/**
 * 전체 화면 영상 + ASS 자막 번인 — 9:16 전용
 */
export async function composeVideoWithSubtitles(
  options: {
    videoPath: string
    assPath: string
    outputPath: string
    videoDuration: number
    startSec?: number
    bgmPath?: string
    removeAudio?: boolean
    watermarkPath?: string
  },
  onProgress?: (percent: number) => void
): Promise<void> {
  const {
    videoPath, assPath, outputPath, videoDuration,
    startSec = 0, bgmPath, removeAudio, watermarkPath
  } = options

  const hasAudio = await probeHasAudio(videoPath)

  return new Promise((resolve, reject) => {
    const args: string[] = []

    // 입력 0: 소스 영상
    args.push('-i', videoPath)

    // 동적 입력 인덱스
    let nextInputIdx = 1

    // BGM 입력
    let bgmInputIdx = -1
    if (bgmPath) {
      bgmInputIdx = nextInputIdx++
      args.push('-i', bgmPath)
    }

    // 워터마크 입력
    let wmInputIdx = -1
    if (watermarkPath) {
      wmInputIdx = nextInputIdx++
      args.push('-i', watermarkPath)
    }

    // 필터 체인
    const filters: string[] = []

    // 영상: trim → 9:16 스케일/크롭 → ASS 자막 번인
    // ASS 필터는 파일 경로에 특수문자 이스케이프 필요
    const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:')

    if (startSec > 0) {
      filters.push(
        `[0:v]trim=start=${startSec}:duration=${videoDuration.toFixed(2)},setpts=PTS-STARTPTS,` +
        `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,` +
        `ass='${escapedAssPath}'[vid]`
      )
    } else {
      filters.push(
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,` +
        `ass='${escapedAssPath}'[vid]`
      )
    }

    // 워터마크 오버레이
    let finalVideo = 'vid'
    if (watermarkPath) {
      filters.push(`[${finalVideo}][${wmInputIdx}:v]overlay=27:20[vidwm]`)
      finalVideo = 'vidwm'
    }

    if (finalVideo !== 'vout') {
      filters.push(`[${finalVideo}]null[vout]`)
    }

    // 오디오
    if (removeAudio) {
      // 무음
    } else if (bgmPath) {
      filters.push(`[${bgmInputIdx}:a]anull[aout]`)
    } else if (hasAudio) {
      if (startSec > 0) {
        filters.push(
          `[0:a]atrim=start=${startSec}:duration=${videoDuration.toFixed(2)},asetpts=PTS-STARTPTS[aout]`
        )
      } else {
        filters.push(`[0:a]anull[aout]`)
      }
    }

    args.push('-filter_complex', filters.join(';'))
    args.push('-map', '[vout]')

    if (removeAudio) {
      args.push('-an')
    } else if (bgmPath || hasAudio) {
      args.push('-map', '[aout]')
      args.push('-c:a', 'aac', '-b:a', '192k')
      if (bgmPath) args.push('-shortest')
    }

    args.push(
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30',
      '-preset', 'fast', '-movflags', '+faststart',
      '-t', videoDuration.toFixed(2), '-y', outputPath
    )

    console.log('[VideoExport] subtitle ffmpeg args:', args.join(' '))

    const proc = spawn(ffmpegPath, args)
    let stderr = ''

    proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderr += text
      const match = text.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/)
      if (match && onProgress && videoDuration > 0) {
        const secs = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3])
        onProgress(Math.min(95, Math.round((secs / videoDuration) * 100)))
      }
    })

    proc.on('close', (code) => {
      if (code === 0) { onProgress?.(100); resolve() }
      else reject(new Error(`FFmpeg exited with code ${code}\n${stderr.slice(-500)}`))
    })

    proc.on('error', (err) => reject(new Error(`FFmpeg spawn error: ${err.message}`)))
  })
}

/**
 * temp 디렉토리 정리
 */
export async function cleanupTemp(dir: string): Promise<void> {
  try {
    await rm(dir, { recursive: true, force: true })
  } catch {
    console.warn('[VideoExport] temp cleanup failed:', dir)
  }
}
