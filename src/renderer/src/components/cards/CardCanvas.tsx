import { useRef, forwardRef, useImperativeHandle } from 'react'
import { toPng, toJpeg } from 'html-to-image'
import { CARD_SIZE } from '@/lib/designTokens'
import { useCardStore } from '@/stores/useCardStore'
import TextEmphasisCard from './TextEmphasisCard'
import ImageBackgroundCard from './ImageBackgroundCard'
import SplitCard from './SplitCard'
import GradientCard from './GradientCard'
import MinimalCard from './MinimalCard'

export interface CardCanvasHandle {
  exportPng: () => Promise<string>
  exportJpeg: () => Promise<string>
}

interface Props {
  scale?: number
}

const CardCanvas = forwardRef<CardCanvasHandle, Props>(({ scale = 0.45 }, ref) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const { selectedLayout, cardData } = useCardStore()

  useImperativeHandle(ref, () => ({
    exportPng: async () => {
      if (!cardRef.current) throw new Error('Card ref not available')
      return toPng(cardRef.current, {
        width: CARD_SIZE,
        height: CARD_SIZE,
        pixelRatio: 2,
        cacheBust: true
      })
    },
    exportJpeg: async () => {
      if (!cardRef.current) throw new Error('Card ref not available')
      return toJpeg(cardRef.current, {
        width: CARD_SIZE,
        height: CARD_SIZE,
        pixelRatio: 2,
        quality: 0.92,
        cacheBust: true
      })
    }
  }))

  const renderCard = () => {
    switch (selectedLayout) {
      case 'text-emphasis':
        return <TextEmphasisCard {...cardData} />
      case 'image-background':
        return <ImageBackgroundCard {...cardData} />
      case 'split-layout':
        return <SplitCard {...cardData} />
      case 'gradient-card':
        return <GradientCard {...cardData} />
      case 'minimal-card':
        return <MinimalCard {...cardData} />
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
      <div
        ref={cardRef}
        style={{
          width: CARD_SIZE,
          height: CARD_SIZE,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative'
        }}
      >
        {renderCard()}
      </div>
    </div>
  )
})

CardCanvas.displayName = 'CardCanvas'
export default CardCanvas
