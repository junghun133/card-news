import { useRef, forwardRef, useImperativeHandle } from 'react'
import { toPng, toJpeg } from 'html-to-image'
import { CARD_SIZE } from '@/lib/designTokens'
import { useCardStore } from '@/stores/useCardStore'
import { PROFILE_ICON_SVG } from '@/lib/profileIcon'
import { exportCardAsGif } from '@/lib/gifExport'
import { useDrag } from '@/hooks/useDrag'
import ImageBackgroundCard from './ImageBackgroundCard'
import TopBottomSplitCard from './TopBottomSplitCard'

export interface CardCanvasHandle {
  exportPng: () => Promise<string>
  exportJpeg: () => Promise<string>
  exportGif: (gifUrl: string, onProgress?: (pct: number) => void) => Promise<string>
}

interface Props {
  scale?: number
  slideIndex?: number
}

const DEFAULT_WM1 = { x: 2.5, y: 3 }

function WatermarkSticker({
  position,
  scale,
  onDragEnd
}: {
  position: { x: number; y: number }
  scale: number
  onDragEnd: (pos: { x: number; y: number }) => void
}) {
  const { localPos, isDragging, handleMouseDown } = useDrag({ position, scale, onDragEnd })

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${localPos.x}%`,
        top: `${localPos.y}%`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 14,
        padding: '8px 16px 8px 10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: isDragging ? 50 : 10,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none' as const
      }}
    >
      <img
        src={PROFILE_ICON_SVG}
        alt=""
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%'
        }}
        draggable={false}
      />
      <span
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#262626',
          letterSpacing: '0.01em',
          fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
          whiteSpace: 'nowrap'
        }}
      >
        pony__news
      </span>
    </div>
  )
}

const CardCanvas = forwardRef<CardCanvasHandle, Props>(({ scale = 0.45, slideIndex }, ref) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const { selectedLayout, cardData, currentSlideIndex, setCardData, slides } = useCardStore()

  const effectiveIndex = slideIndex ?? currentSlideIndex
  const isLastSlide = effectiveIndex === slides.length - 1
  const wm1Pos = cardData.watermark1Position ?? DEFAULT_WM1

  useImperativeHandle(ref, () => ({
    exportPng: async () => {
      if (!cardRef.current) throw new Error('Card ref not available')
      return toPng(cardRef.current, {
        width: CARD_SIZE,
        height: CARD_SIZE,
        pixelRatio: 1,
        cacheBust: true
      })
    },
    exportJpeg: async () => {
      if (!cardRef.current) throw new Error('Card ref not available')
      return toJpeg(cardRef.current, {
        width: CARD_SIZE,
        height: CARD_SIZE,
        pixelRatio: 1,
        quality: 0.92,
        cacheBust: true
      })
    },
    exportGif: async (gifUrl: string, onProgress?: (pct: number) => void) => {
      if (!cardRef.current) throw new Error('Card ref not available')
      return exportCardAsGif({
        cardElement: cardRef.current,
        gifUrl,
        size: CARD_SIZE,
        onProgress
      })
    }
  }))

  const renderCard = () => {
    switch (selectedLayout) {
      case 'image-background':
        return <ImageBackgroundCard {...cardData} slideIndex={effectiveIndex} scale={scale} />
      case 'top-bottom-split':
        return <TopBottomSplitCard {...cardData} slideIndex={effectiveIndex} scale={scale} />
    }
  }

  return (
    <div
      style={{
        width: CARD_SIZE * scale,
        height: CARD_SIZE * scale,
        overflow: 'hidden',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
      }}
    >
      {/* scale wrapper — cardRef 바깥에 위치하여 export 시 영향 없음 */}
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
      >
        {/* cardRef — transform 없는 1080x1080 원본. html-to-image는 이것을 캡처 */}
        <div
          ref={cardRef}
          style={{
            width: CARD_SIZE,
            height: CARD_SIZE,
            position: 'relative'
          }}
        >
          {renderCard()}

          {/* 워터마크 스티커 (마지막 슬라이드 제외) */}
          {!isLastSlide && (
            <WatermarkSticker
              position={wm1Pos}
              scale={scale}
              onDragEnd={(pos) => setCardData({ watermark1Position: pos })}
            />
          )}
        </div>
      </div>
    </div>
  )
})

CardCanvas.displayName = 'CardCanvas'
export default CardCanvas
