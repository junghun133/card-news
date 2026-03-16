import type { CardData, TextBlock } from '@/types'
import { LAYOUT_STYLES } from '@/lib/cardTemplates'
import { CARD_SIZE, FONTS } from '@/lib/designTokens'
import { renderRichText } from '@/lib/renderRichText'
import { useCardStore } from '@/stores/useCardStore'
import { useDrag } from '@/hooks/useDrag'

const s = LAYOUT_STYLES['top-bottom-split']

const DEFAULT_KW_POS = { x: 3.7, y: 60 }
const DEFAULT_DESC_POS = { x: 3.7, y: 69 }

interface Props extends CardData {
  slideIndex: number
  scale?: number
}

function Draggable({
  position,
  scale,
  onDragEnd,
  zBase = 5,
  children
}: {
  position: { x: number; y: number }
  scale: number
  onDragEnd: (pos: { x: number; y: number }) => void
  zBase?: number
  children: React.ReactNode
}) {
  const { localPos, isDragging, handleMouseDown } = useDrag({ position, scale, onDragEnd })
  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${localPos.x}%`,
        top: `${localPos.y}%`,
        zIndex: isDragging ? 50 : zBase,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
    >
      {children}
    </div>
  )
}

export default function TopBottomSplitCard({
  keyword,
  description,
  source,
  backgroundImageUrl,
  slideIndex,
  textBlocks,
  keywordFontSize,
  descriptionFontSize,
  keywordPosition,
  descriptionPosition,
  sourcePosition,
  scale = 0.45
}: Props) {
  const imageHeight = CARD_SIZE * (s.imageSplitRatio / 100)
  const isCover = slideIndex === 0
  const setCardData = useCardStore((s) => s.setCardData)
  const srcPos = sourcePosition ?? { x: 3.7, y: 93 }

  const kwPos = keywordPosition ?? DEFAULT_KW_POS
  const descPos = descriptionPosition ?? DEFAULT_DESC_POS

  return (
    <div
      style={{
        width: CARD_SIZE,
        height: CARD_SIZE,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: FONTS.heading,
        backgroundColor: s.outerBg
      }}
    >
      {/* 상단: 이미지 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: imageHeight,
          overflow: 'hidden',
          backgroundColor: '#1a1a2e'
        }}
      >
        {backgroundImageUrl && (
          <img
            src={backgroundImageUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            crossOrigin="anonymous"
          />
        )}
      </div>

      {/* 하단 배경 + 왼쪽 보더 */}
      <div
        style={{
          position: 'absolute',
          top: imageHeight,
          left: 0,
          right: 0,
          bottom: 0,
          borderLeft: `${s.titleBorderWidth}px solid ${s.titleBorderColor}`,
          marginLeft: 20
        }}
      />

      {/* 키워드 — 드래그 가능 */}
      <Draggable
        position={kwPos}
        scale={scale}
        onDragEnd={(pos) => setCardData({ keywordPosition: pos })}
        zBase={6}
      >
        <div
          style={{
            fontSize: keywordFontSize || 68,
            fontWeight: 800,
            color: s.keywordColor,
            lineHeight: 1.25,
            wordBreak: 'keep-all',
            whiteSpace: 'pre-wrap',
            maxWidth: CARD_SIZE * 0.88
          }}
        >
          {renderRichText(keyword)}
        </div>
      </Draggable>

      {/* 설명 — 드래그 가능 */}
      {!isCover && description && (
        <Draggable
          position={descPos}
          scale={scale}
          onDragEnd={(pos) => setCardData({ descriptionPosition: pos })}
          zBase={5}
        >
          <div
            style={{
              fontSize: descriptionFontSize || 33,
              fontWeight: 400,
              color: s.descriptionColor,
              lineHeight: 1.6,
              wordBreak: 'keep-all',
              whiteSpace: 'pre-wrap',
              maxWidth: CARD_SIZE * 0.88
            }}
          >
            {renderRichText(description)}
          </div>
        </Draggable>
      )}

      {/* 출처 — 드래그 가능 */}
      {source && (
        <Draggable
          position={srcPos}
          scale={scale}
          onDragEnd={(pos) => setCardData({ sourcePosition: pos })}
          zBase={4}
        >
          <div
            style={{
              fontSize: s.sourceSize,
              color: s.sourceColor
            }}
          >
            {source}
          </div>
        </Draggable>
      )}

      {/* 텍스트 블록 — 드래그 가능 */}
      {textBlocks?.map((block) => (
        <DraggableTextBlock key={block.id} block={block} scale={scale} />
      ))}
    </div>
  )
}

function DraggableTextBlock({ block, scale }: { block: TextBlock; scale: number }) {
  const setCardData = useCardStore((s) => s.setCardData)
  const textBlocks = useCardStore((s) => s.cardData.textBlocks)

  const handleDragEnd = (pos: { x: number; y: number }) => {
    const updated = (textBlocks || []).map((b) =>
      b.id === block.id ? { ...b, x: pos.x, y: pos.y } : b
    )
    setCardData({ textBlocks: updated })
  }

  return (
    <Draggable
      position={{ x: block.x, y: block.y }}
      scale={scale}
      onDragEnd={handleDragEnd}
      zBase={8}
    >
      <div
        style={{
          fontSize: block.fontSize,
          fontWeight: block.fontWeight,
          color: block.color,
          maxWidth: `${block.maxWidth}%`,
          lineHeight: 1.4,
          wordBreak: 'keep-all',
          whiteSpace: 'pre-wrap',
          textShadow: '1px 1px 4px rgba(0,0,0,0.5)'
        }}
      >
        {block.content}
      </div>
    </Draggable>
  )
}
