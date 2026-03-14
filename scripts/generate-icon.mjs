/**
 * profile_logo.png → 정사각형 아이콘 PNG + ICO 생성
 * 사용법: node scripts/generate-icon.mjs
 */
import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const SOURCE = join(ROOT, 'src', 'profile_logo.png')
const OUT_DIR = join(ROOT, 'resources')

async function generateIcons() {
  console.log('📦 Loading source image...')
  const meta = await sharp(SOURCE).metadata()
  console.log(`  Source: ${meta.width}x${meta.height}`)

  // 정사각형으로 만들기 (가장 긴 변 기준, 투명 패딩)
  const size = Math.max(meta.width, meta.height)
  const squareBuffer = await sharp(SOURCE)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 } // 투명 배경
    })
    .png()
    .toBuffer()

  // 256x256 PNG (Electron BrowserWindow icon)
  const icon256 = await sharp(squareBuffer)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  writeFileSync(join(OUT_DIR, 'icon.png'), icon256)
  console.log('✅ icon.png (256x256)')

  // ICO 파일 생성 (16, 32, 48, 64, 128, 256 크기)
  const sizes = [16, 32, 48, 64, 128, 256]
  const icoImages = []

  for (const s of sizes) {
    const buf = await sharp(squareBuffer)
      .resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    icoImages.push({ size: s, buffer: buf })
    console.log(`  Generated ${s}x${s}`)
  }

  // ICO 파일 포맷 수동 생성
  const icoBuffer = createIco(icoImages)
  writeFileSync(join(OUT_DIR, 'icon.ico'), icoBuffer)
  console.log('✅ icon.ico (16/32/48/64/128/256)')

  console.log(`\n🎉 Icons saved to ${OUT_DIR}`)
}

/**
 * PNG 버퍼 배열 → ICO 파일 버퍼 생성
 * ICO format: https://en.wikipedia.org/wiki/ICO_(file_format)
 */
function createIco(images) {
  const headerSize = 6
  const dirEntrySize = 16
  const numImages = images.length

  // 전체 ICO 파일 크기 계산
  let dataOffset = headerSize + dirEntrySize * numImages
  const entries = images.map((img) => {
    const entry = {
      size: img.size,
      buffer: img.buffer,
      offset: dataOffset
    }
    dataOffset += img.buffer.length
    return entry
  })

  const totalSize = dataOffset
  const ico = Buffer.alloc(totalSize)

  // ICO Header
  ico.writeUInt16LE(0, 0)         // Reserved
  ico.writeUInt16LE(1, 2)         // Type: 1 = ICO
  ico.writeUInt16LE(numImages, 4) // Image count

  // Directory entries
  entries.forEach((entry, i) => {
    const off = headerSize + i * dirEntrySize
    ico.writeUInt8(entry.size >= 256 ? 0 : entry.size, off)     // Width (0 = 256)
    ico.writeUInt8(entry.size >= 256 ? 0 : entry.size, off + 1) // Height (0 = 256)
    ico.writeUInt8(0, off + 2)                                   // Color palette
    ico.writeUInt8(0, off + 3)                                   // Reserved
    ico.writeUInt16LE(1, off + 4)                                // Color planes
    ico.writeUInt16LE(32, off + 6)                               // Bits per pixel
    ico.writeUInt32LE(entry.buffer.length, off + 8)              // Data size
    ico.writeUInt32LE(entry.offset, off + 12)                    // Data offset
  })

  // Image data
  entries.forEach((entry) => {
    entry.buffer.copy(ico, entry.offset)
  })

  return ico
}

generateIcons().catch(console.error)
