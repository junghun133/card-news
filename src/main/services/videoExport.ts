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
 * temp 디렉토리 정리
 */
export async function cleanupTemp(dir: string): Promise<void> {
  try {
    await rm(dir, { recursive: true, force: true })
  } catch {
    console.warn('[VideoExport] temp cleanup failed:', dir)
  }
}
