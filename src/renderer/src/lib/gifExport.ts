import { decompressFrames, parseGIF } from 'gifuct-js'
import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import { toPng } from 'html-to-image'

/**
 * URL이 GIF 이미지인지 판별
 */
export function isGifUrl(url?: string): boolean {
  if (!url) return false
  if (url.startsWith('data:image/gif')) return true
  try {
    const pathname = new URL(url).pathname
    return pathname.toLowerCase().endsWith('.gif')
  } catch {
    return url.toLowerCase().includes('.gif')
  }
}

interface ExportGifOptions {
  /** html-to-image로 캡처할 카드 DOM 요소 */
  cardElement: HTMLElement
  /** GIF 배경 이미지 URL (data URL 또는 HTTP URL) */
  gifUrl: string
  /** 출력 크기 (정사각형) */
  size: number
  /** 진행률 콜백 (0~100) */
  onProgress?: (pct: number) => void
}

/**
 * GIF 배경이 있는 카드를 텍스트 오버레이 포함 GIF로 내보내기
 *
 * 1. GIF를 프레임 단위로 디코딩 (gifuct-js)
 * 2. 카드의 텍스트/그래디언트 오버레이를 PNG(투명)로 캡처
 * 3. 각 프레임에 오버레이를 합성
 * 4. gifenc으로 GIF 인코딩 (순수 JS, 워커 불필요)
 */
export async function exportCardAsGif({
  cardElement,
  gifUrl,
  size,
  onProgress
}: ExportGifOptions): Promise<string> {
  console.log('[GIF Export] 시작:', { gifUrl: gifUrl.slice(0, 80), size })

  // 1. GIF 프레임 파싱
  onProgress?.(5)
  const gifBuffer = await fetchAsArrayBuffer(gifUrl)
  console.log('[GIF Export] GIF 데이터 로드 완료:', gifBuffer.byteLength, 'bytes')

  const parsed = parseGIF(gifBuffer)
  const frames = decompressFrames(parsed, true)
  console.log('[GIF Export] 프레임 파싱 완료:', frames.length, '프레임')

  if (!frames.length) throw new Error('GIF에 프레임이 없습니다')

  // 2. 텍스트/그래디언트 오버레이 캡처 (배경 이미지 숨김)
  onProgress?.(10)
  const overlayDataUrl = await captureCardOverlay(cardElement, size)
  const overlayImg = await loadImage(overlayDataUrl)
  console.log('[GIF Export] 오버레이 캡처 완료')
  onProgress?.(20)

  // 3. GIF 인코더 생성 (gifenc — 순수 JS, 워커 불필요)
  const gif = GIFEncoder()

  // 원본 GIF 크기의 캔버스 (프레임 누적용)
  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = parsed.lsd.width
  srcCanvas.height = parsed.lsd.height
  const srcCtx = srcCanvas.getContext('2d')!

  // 출력 캔버스 (합성용)
  const outCanvas = document.createElement('canvas')
  outCanvas.width = size
  outCanvas.height = size
  const outCtx = outCanvas.getContext('2d')!

  // 4. 각 프레임 합성 + 인코딩
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i]

    // disposal: 2 = restore to background (clear)
    if (f.disposalType === 2) {
      srcCtx.clearRect(0, 0, srcCanvas.width, srcCanvas.height)
    }

    // 프레임 패치를 원본 캔버스에 그리기
    const imgData = srcCtx.createImageData(f.dims.width, f.dims.height)
    imgData.data.set(f.patch)
    srcCtx.putImageData(imgData, f.dims.left, f.dims.top)

    // 출력 캔버스에 스케일링하여 그리기
    outCtx.clearRect(0, 0, size, size)
    outCtx.drawImage(srcCanvas, 0, 0, size, size)

    // 오버레이 합성
    outCtx.drawImage(overlayImg, 0, 0, size, size)

    // RGBA 픽셀 데이터 추출
    const rgba = outCtx.getImageData(0, 0, size, size).data

    // 색상 양자화 + 인덱스 변환
    const palette = quantize(rgba, 256)
    const index = applyPalette(rgba, palette)

    // 프레임 추가 (delay: gifuct-js는 1/100초, gifenc도 1/100초)
    gif.writeFrame(index, size, size, {
      palette,
      delay: Math.max(f.delay, 2), // 최소 20ms (2 centiseconds)
      dispose: f.disposalType === 2 ? 2 : 0
    })

    onProgress?.(20 + ((i + 1) / frames.length) * 70)

    // UI 블로킹 방지: 매 5프레임마다 yield
    if (i % 5 === 0) {
      await new Promise((r) => setTimeout(r, 0))
    }
  }

  // 5. GIF 인코딩 완료
  gif.finish()
  const bytes = gif.bytes()
  console.log('[GIF Export] 인코딩 완료:', bytes.length, 'bytes')

  onProgress?.(100)

  // Uint8Array → data URL
  const blob = new Blob([bytes], { type: 'image/gif' })
  return blobToDataUrl(blob)
}

// ─── helpers ───

async function fetchAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  if (url.startsWith('data:')) {
    const b64 = url.split(',')[1]
    const bin = atob(b64)
    const buf = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
    return buf.buffer
  }
  return (await fetch(url)).arrayBuffer()
}

/**
 * 카드의 텍스트/그래디언트 오버레이만 캡처 (배경 이미지 숨김, 투명 배경)
 */
async function captureCardOverlay(el: HTMLElement, size: number): Promise<string> {
  // 배경 이미지 <img crossorigin> 찾기 — 여러 개일 수 있으므로 모두 숨김
  const bgImgs = el.querySelectorAll('img[crossorigin]') as NodeListOf<HTMLImageElement>
  const cardRoot = el.firstElementChild as HTMLElement | null

  // 원래 상태 백업
  const prevDisplays = Array.from(bgImgs).map((img) => img.style.display)
  const prevBg = cardRoot?.style.backgroundColor

  // 배경 이미지 숨기기 + 루트 배경 투명
  bgImgs.forEach((img) => (img.style.display = 'none'))
  if (cardRoot) cardRoot.style.backgroundColor = 'transparent'

  try {
    return await toPng(el, {
      width: size,
      height: size,
      pixelRatio: 1,
      cacheBust: true
    })
  } finally {
    // 원래 상태 복원
    bgImgs.forEach((img, i) => (img.style.display = prevDisplays[i] ?? ''))
    if (cardRoot) cardRoot.style.backgroundColor = prevBg ?? ''
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
