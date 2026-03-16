import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { mkdir, stat, readdir } from 'fs/promises'
import { app } from 'electron'

// youtube-dl-exec는 externalized dependency
// eslint-disable-next-line @typescript-eslint/no-require-imports
const youtubedl = require('youtube-dl-exec')

// ffmpeg-static 경로 — yt-dlp가 비디오+오디오 merge 시 필요
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static')

/**
 * 한글 경로 문제를 피하기 위한 안전한 temp 디렉토리
 */
function getSafeTempDir(): string {
  // app.getPath('temp')는 Electron이 관리하는 경로
  // 한글이 포함될 수 있으므로 고정 ASCII 경로 사용
  const candidates = [
    'C:\\Temp',
    process.env.TEMP || '',
    tmpdir()
  ]
  // C:\Temp가 가장 안전 (한글 없음)
  return candidates[0]
}

/**
 * YouTube/영상 URL에서 동영상 다운로드
 * @returns 다운로드된 MP4 파일 경로
 */
export async function downloadVideo(
  url: string,
  onProgress?: (percent: number) => void
): Promise<{ filePath: string; title: string }> {
  // 한글 사용자명 경로를 피하기 위해 C:\Temp 사용
  const baseDir = getSafeTempDir()
  const dir = join(baseDir, `card-news-dl-${Date.now()}`)
  await mkdir(dir, { recursive: true })

  // 고정 ASCII 파일명 사용 (한글 제목 인코딩 깨짐 방지)
  const outputPath = join(dir, 'source.mp4')

  onProgress?.(5)

  // yt-dlp로 다운로드 (MP4 포맷 우선, 고정 파일명)
  // ffmpegLocation: yt-dlp가 비디오+오디오를 merge할 때 ffmpeg 경로 필요
  await youtubedl(url, {
    output: outputPath,
    format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    mergeOutputFormat: 'mp4',
    ffmpegLocation: dirname(ffmpegPath),
    noPlaylist: true,
    noCheckCertificates: true
  })

  // 파일 존재 확인 (yt-dlp가 확장자를 변경할 수 있으므로 디렉토리 검색)
  let filePath = outputPath
  try {
    await stat(filePath)
  } catch {
    // source.mp4가 없으면 디렉토리에서 첫 번째 영상 파일 찾기
    const files = await readdir(dir)
    const videoFile = files.find(f => /\.(mp4|mkv|webm|mov)$/i.test(f))
    if (videoFile) {
      filePath = join(dir, videoFile)
    } else {
      throw new Error(`다운로드된 영상 파일을 찾을 수 없습니다: ${dir}`)
    }
  }

  onProgress?.(100)

  // 제목은 메타데이터에서 별도로 가져올 수 있으므로 파일명에 의존하지 않음
  return { filePath, title: 'source' }
}

/**
 * URL에서 영상 메타데이터 추출 (다운로드 없이)
 */
export async function getVideoInfo(url: string): Promise<{
  title: string
  description: string
  duration: number
  uploader: string
  uploadDate: string
  viewCount: number
}> {
  console.log('[VideoDownload] getVideoInfo called for:', url)

  // 30초 타임아웃
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('영상 정보 추출 시간 초과 (30초)')), 30000)
  )

  try {
    const result = await Promise.race([
      youtubedl(url, {
        dumpSingleJson: true,
        noDownload: true,
        noPlaylist: true,
        noCheckCertificates: true
      }),
      timeout
    ])

    console.log('[VideoDownload] yt-dlp result type:', typeof result)
    const info = typeof result === 'string' ? JSON.parse(result) : result
    console.log('[VideoDownload] Parsed info title:', info.title)

    return {
      title: info.title || '',
      description: (info.description || '').slice(0, 3000),
      duration: info.duration || 0,
      uploader: info.uploader || info.channel || '',
      uploadDate: info.upload_date || '',
      viewCount: info.view_count || 0
    }
  } catch (err: any) {
    console.error('[VideoDownload] getVideoInfo failed:', err.message)
    throw new Error(`영상 정보를 가져올 수 없습니다: ${err.message}`)
  }
}

/**
 * URL이 YouTube 등 지원되는 영상 플랫폼인지 확인
 */
export function isSupportedVideoUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    return (
      host.includes('youtube.com') ||
      host.includes('youtu.be') ||
      host.includes('instagram.com') ||
      host.includes('tiktok.com') ||
      host.includes('twitter.com') ||
      host.includes('x.com') ||
      host.includes('naver.com') ||
      host.includes('v.daum.net')
    )
  } catch {
    return false
  }
}
