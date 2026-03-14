import { useRef, forwardRef, useImperativeHandle } from 'react'
import { toPng, toJpeg } from 'html-to-image'
import { CARD_SIZE } from '@/lib/designTokens'
import { useCardStore } from '@/stores/useCardStore'
import { PROFILE_ICON_SVG } from '@/lib/profileIcon'
import ImageBackgroundCard from './ImageBackgroundCard'
import TopBottomSplitCard from './TopBottomSplitCard'

export interface CardCanvasHandle {
  exportPng: () => Promise<string>
  exportJpeg: () => Promise<string>
}

interface Props {
  scale?: number
  slideIndex?: number
}

const CardCanvas = forwardRef<CardCanvasHandle, Props>(({ scale = 0.45, slideIndex }, ref) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const { selectedLayout, cardData, currentSlideIndex } = useCardStore()

  const effectiveIndex = slideIndex ?? currentSlideIndex

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
    }
  }))

  const renderCard = () => {
    switch (selectedLayout) {
      case 'image-background':
        return <ImageBackgroundCard {...cardData} slideIndex={effectiveIndex} />
      case 'top-bottom-split':
        return <TopBottomSplitCard {...cardData} slideIndex={effectiveIndex} />
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

          {/* 워터마크 — 모든 카드 좌상단 */}
          <div
            style={{
              position: 'absolute',
              top: 32,
              left: 28,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              zIndex: 10,
              pointerEvents: 'none'
            }}
          >
            <img
              src={PROFILE_ICON_SVG}
              alt=""
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.8)',
                padding: 2
              }}
            />
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.6)',
                textShadow: '1px 1px 4px rgba(0,0,0,0.5)',
                letterSpacing: '0.02em',
                fontFamily: "'A2G', 'Noto Sans KR', sans-serif"
              }}
            >
              pony__news
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})

CardCanvas.displayName = 'CardCanvas'
export default CardCanvas
