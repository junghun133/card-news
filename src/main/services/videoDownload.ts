import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { mkdir, stat, readdir, readFile, unlink } from 'fs/promises'
import { readdirSync } from 'fs'
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
    noCheckCertificates: true,
    jsRuntimes: 'node'
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
        noCheckCertificates: true,
        jsRuntimes: 'node'
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

// ─── 자막 추출 ───

export interface SubtitleEntry {
  index: number
  startTime: string   // "00:00:01,000"
  endTime: string     // "00:00:03,500"
  startSec: number
  endSec: number
  text: string
}

/**
 * SRT 타임코드("00:01:23,456")를 초 단위로 변환
 */
function srtTimeToSec(time: string): number {
  const [hms, ms] = time.split(',')
  const [h, m, s] = hms.split(':').map(Number)
  return h * 3600 + m * 60 + s + (parseInt(ms || '0') / 1000)
}

/**
 * SRT 문자열을 SubtitleEntry 배열로 파싱
 * YouTube 자동 자막의 중복/빈 라인 자동 정리
 */
export function parseSrt(srtContent: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = []
  // BOM 제거 + 정규화
  const cleaned = srtContent.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim()
  const blocks = cleaned.split(/\n\n+/)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue

    // 첫 줄: 인덱스 (숫자)
    const idx = parseInt(lines[0])
    if (isNaN(idx)) continue

    // 둘째 줄: 타임코드
    const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/)
    if (!timeMatch) continue

    // 나머지 줄: 텍스트
    const text = lines.slice(2).join('\n').trim()
    if (!text) continue

    const startTime = timeMatch[1]
    const endTime = timeMatch[2]

    entries.push({
      index: idx,
      startTime,
      endTime,
      startSec: srtTimeToSec(startTime),
      endSec: srtTimeToSec(endTime),
      text
    })
  }

  // YouTube 자동 자막: 연속 중복 텍스트 제거
  const deduped: SubtitleEntry[] = []
  for (const entry of entries) {
    const prev = deduped[deduped.length - 1]
    if (prev && prev.text === entry.text) {
      // 같은 텍스트면 endTime만 확장
      prev.endTime = entry.endTime
      prev.endSec = entry.endSec
    } else {
      deduped.push({ ...entry, index: deduped.length + 1 })
    }
  }

  return deduped
}

/**
 * YouTube 영상에서 자막 추출 (자동 자막 포함)
 * @returns 자막 배열 또는 null (자막 없음)
 */
export async function extractSubtitles(url: string): Promise<SubtitleEntry[] | null> {
  const baseDir = getSafeTempDir()
  const dir = join(baseDir, `card-news-sub-${Date.now()}`)
  await mkdir(dir, { recursive: true })

  const outputTemplate = join(dir, 'sub')

  // 한 언어씩 순차 시도 (여러 언어 동시 요청 시 YouTube 429 에러 발생)
  const langPriority = ['en', 'ja', 'zh', 'es', 'fr', 'de', 'ko']

  console.log('[Subtitle] Extracting subtitles from:', url)
  console.log('[Subtitle] Temp dir:', dir)

  for (const lang of langPriority) {
    console.log(`[Subtitle] Trying language: ${lang}`)

    try {
      await youtubedl(url, {
        output: outputTemplate,
        writeAutoSub: true,
        writeSub: true,
        subLang: lang,
        skipDownload: true,
        convertSubs: 'srt',
        noPlaylist: true,
        noCheckCertificates: true,
        ffmpegLocation: dirname(ffmpegPath),
        jsRuntimes: 'node'
      })

      // 생성된 SRT 파일 찾기
      const files = readdirSync(dir).filter(f => f.endsWith('.srt'))
      console.log(`[Subtitle] [${lang}] Found files:`, files)

      if (files.length === 0) {
        console.log(`[Subtitle] [${lang}] No SRT files generated, trying next language`)
        continue
      }

      const selectedFile = files[0]
      console.log(`[Subtitle] Using: ${selectedFile}`)

      const srtContent = await readFile(join(dir, selectedFile), 'utf-8')
      console.log(`[Subtitle] SRT content length: ${srtContent.length} chars`)
      console.log(`[Subtitle] SRT preview: ${srtContent.slice(0, 300)}`)

      const entries = parseSrt(srtContent)
      console.log(`[Subtitle] Parsed ${entries.length} entries`)

      if (entries.length > 0) {
        // 임시 파일 정리
        for (const f of files) {
          try { await unlink(join(dir, f)) } catch { /* ignore */ }
        }
        return entries
      }

      console.log(`[Subtitle] [${lang}] 0 entries after parsing, trying next language`)
      // 파일 정리 후 다음 언어 시도
      for (const f of files) {
        try { await unlink(join(dir, f)) } catch { /* ignore */ }
      }
    } catch (err: any) {
      console.warn(`[Subtitle] [${lang}] Failed: ${err.message?.slice(0, 200)}`)
      // 이 언어 실패해도 다음 언어 시도
      continue
    }
  }

  console.log('[Subtitle] All languages exhausted, no subtitles found')
  return null
}
