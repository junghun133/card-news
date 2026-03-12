import { useRef, useState } from 'react'
import CardCanvas, { type CardCanvasHandle } from '@/components/cards/CardCanvas'
import CardEditor from '@/components/editor/CardEditor'
import ImagePicker from '@/components/editor/ImagePicker'
import Button from '@/components/common/Button'
import { useCardStore } from '@/stores/useCardStore'
import { useToastStore } from '@/stores/useToastStore'
import { CARD_TEMPLATES } from '@/lib/cardTemplates'

export default function EditorPage() {
  const canvasRef = useRef<CardCanvasHandle>(null)
  const { cardData, selectedLayout } = useCardStore()
  const addToast = useToastStore((s) => s.addToast)
  const [exporting, setExporting] = useState(false)
  const [captionCopied, setCaptionCopied] = useState(false)

  const handleExport = async (format: 'png' | 'jpeg' = 'png') => {
    if (!canvasRef.current) return
    setExporting(true)
    try {
      const dataUrl =
        format === 'jpeg'
          ? await canvasRef.current.exportJpeg()
          : await canvasRef.current.exportPng()

      if (window.api) {
        const result = await window.api.saveImage(dataUrl)
        if (result.success) {
          addToast('success', `${format.toUpperCase()} 파일이 저장되었습니다.`)
        } else if (result.reason !== 'canceled') {
          addToast('error', '저장에 실패했습니다.')
        }
      } else {
        const link = document.createElement('a')
        link.download = `card-news-${Date.now()}.${format}`
        link.href = dataUrl
        link.click()
        addToast('success', `${format.toUpperCase()} 파일이 다운로드되었습니다.`)
      }
    } catch (err) {
      console.error('Export failed:', err)
      addToast('error', '내보내기에 실패했습니다.')
    } finally {
      setExporting(false)
    }
  }

  const handleCopyCaption = async () => {
    const caption =
      cardData.caption ||
      `${cardData.title}\n\n${cardData.description}\n\n${cardData.hashtags?.join(' ') || ''}`
    navigator.clipboard.writeText(caption)
    setCaptionCopied(true)
    addToast('success', '캡션이 클립보드에 복사되었습니다.')
    setTimeout(() => setCaptionCopied(false), 2000)
  }

  const handleRegenerateCaption = async () => {
    if (!window.api) return
    try {
      const result = await window.api.generateCaption(cardData)
      if (result.success) {
        useCardStore.getState().setCardData({ caption: result.caption })
        addToast('success', '캡션이 재생성되었습니다.')
      } else {
        addToast('error', '캡션 생성에 실패했습니다. API 키를 확인해주세요.')
      }
    } catch {
      addToast('error', 'OpenAI API 키를 확인해주세요.')
    }
  }

  const tmpl = CARD_TEMPLATES[selectedLayout]
  const showImagePicker = tmpl?.needsImage ?? false

  return (
    <div className="flex h-full gap-6">
      {/* 좌측: 카드 미리보기 */}
      <div className="flex flex-col items-center gap-4">
        <CardCanvas ref={canvasRef} scale={0.48} />

        {/* 내보내기 버튼 */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleExport('png')} disabled={exporting}>
            {exporting ? '내보내는 중...' : 'PNG 내보내기'}
          </Button>
          <Button variant="secondary" onClick={() => handleExport('jpeg')} disabled={exporting}>
            JPG 내보내기
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleCopyCaption}>
            {captionCopied ? '복사 완료!' : '캡션 복사'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRegenerateCaption}>
            캡션 재생성
          </Button>
        </div>
      </div>

      {/* 우측: 편집 패널 */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-cream-dark bg-white p-5 dark:border-gray-600 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-bold text-text-dark dark:text-white">카드 편집</h3>
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
