import { useRef, useState } from 'react'
import CardCanvas, { type CardCanvasHandle } from '@/components/cards/CardCanvas'
import CardEditor from '@/components/editor/CardEditor'
import ImagePicker from '@/components/editor/ImagePicker'
import Button from '@/components/common/Button'
import { useCardStore } from '@/stores/useCardStore'

export default function EditorPage() {
  const canvasRef = useRef<CardCanvasHandle>(null)
  const { cardData, selectedLayout } = useCardStore()
  const [exporting, setExporting] = useState(false)
  const [captionCopied, setCaptionCopied] = useState(false)

  const handleExport = async () => {
    if (!canvasRef.current) return
    setExporting(true)
    try {
      const dataUrl = await canvasRef.current.exportPng()
      // Electron IPC로 저장
      if (window.api) {
        await window.api.saveImage(dataUrl)
      } else {
        // 브라우저 fallback
        const link = document.createElement('a')
        link.download = `card-news-${Date.now()}.png`
        link.href = dataUrl
        link.click()
      }
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const handleCopyCaption = () => {
    const caption =
      cardData.caption ||
      `${cardData.title}\n\n${cardData.description}\n\n${cardData.hashtags?.join(' ') || ''}`
    navigator.clipboard.writeText(caption)
    setCaptionCopied(true)
    setTimeout(() => setCaptionCopied(false), 2000)
  }

  const showImagePicker = selectedLayout !== 'text-emphasis'

  return (
    <div className="flex h-full gap-6">
      {/* 좌측: 카드 미리보기 */}
      <div className="flex flex-col items-center gap-4">
        <CardCanvas ref={canvasRef} scale={0.48} />

        {/* 내보내기 버튼 */}
        <div className="flex gap-3">
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? '내보내는 중...' : 'PNG로 내보내기'}
          </Button>
          <Button variant="secondary" onClick={handleCopyCaption}>
            {captionCopied ? '복사 완료!' : '캡션 복사'}
          </Button>
        </div>
      </div>

      {/* 우측: 편집 패널 */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-cream-dark bg-white p-5">
        <h3 className="mb-4 text-lg font-bold text-text-dark">카드 편집</h3>
        <CardEditor />
        {showImagePicker && (
          <div className="mt-4">
            <ImagePicker />
          </div>
        )}
      </div>
    </div>
  )
}
