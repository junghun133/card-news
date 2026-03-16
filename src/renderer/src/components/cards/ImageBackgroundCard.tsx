import type { CardData, TextBlock } from '@/types'
import { LAYOUT_STYLES } from '@/lib/cardTemplates'
import { CARD_SIZE, FONTS } from '@/lib/designTokens'
import { renderRichText } from '@/lib/renderRichText'
import { PROFILE_ICON_SVG } from '@/lib/profileIcon'
import { useCardStore } from '@/stores/useCardStore'
import { useDrag } from '@/hooks/useDrag'
import newsIcon from '@/assets/news_icon.png'

const s = LAYOUT_STYLES['image-background']

const DEFAULT_KW_POS = { x: 4.6, y: 60 }
const DEFAULT_DESC_POS = { x: 4.6, y: 69 }

interface Props extends CardData {
  slideIndex: number
  totalSlides?: number
  scale?: number
}

// --- 드래그 가능한 요소 래퍼 ---
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

export default function ImageBackgroundCard({
  keyword,
  title,
  description,
  source,
  backgroundImageUrl,
  slideIndex,
  textBlocks,
  coverTitleSegments,
  isProfileCard,
  showNewsIcon,
  keywordFontSize,
  titleFontSize,
  descriptionFontSize,
  keywordPosition,
  descriptionPosition,
  sourcePosition,
  scale = 0.45
}: Props) {
  const isCover = slideIndex === 0
  const setCardData = useCardStore((s) => s.setCardData)

  const kwPos = keywordPosition ?? DEFAULT_KW_POS
  const descPos = descriptionPosition ?? DEFAULT_DESC_POS
  const srcPos = sourcePosition ?? { x: 4.6, y: 93 }

  // 프로필 소개 카드
  if (isProfileCard) {
    return (
      <div
        style={{
          width: CARD_SIZE,
          height: CARD_SIZE,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: FONTS.heading,
          backgroundColor: '#0D1117'
        }}
      >
        {backgroundImageUrl && (
          <img
            src={backgroundImageUrl}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(20px) brightness(0.3)',
              transform: 'scale(1.1)'
            }}
            crossOrigin="anonymous"
          />
        )}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 32,
            padding: 80
          }}
        >
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: '50%',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}
          >
            <img
              src={PROFILE_ICON_SVG}
              alt="profile"
              style={{ width: 100, height: 100, objectFit: 'cover' }}
            />
          </div>

          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '0.02em'
            }}
          >
            pony__news
          </div>

          <div
            style={{
              width: 80,
              height: 3,
              background: 'linear-gradient(90deg, #FFE066, #FF6B6B)',
              borderRadius: 2
            }}
          />

          <div
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: '#E0E0E0',
              textAlign: 'center',
              lineHeight: 1.7,
              wordBreak: 'keep-all'
            }}
          >
            최신 뉴스와 트렌드 정보를{'\n'}
            카드뉴스로 빠르게 전달해요!{'\n\n'}
            <span style={{ color: '#FFE066', fontWeight: 700 }}>팔로우</span>하고{' '}
            <span style={{ color: '#FFE066', fontWeight: 700 }}>소식</span> 받아보세요
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        width: CARD_SIZE,
        height: CARD_SIZE,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: FONTS.heading,
        backgroundColor: s.fallbackBg
      }}
    >
      {backgroundImageUrl && (
        <img
          src={backgroundImageUrl}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          crossOrigin="anonymous"
        />
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isCover ? s.coverOverlayGradient : s.overlayGradient
        }}
      />

      {/* 속보 아이콘 (커버 카드 전용) */}
      {isCover && showNewsIcon && (
        <img
          src={newsIcon}
          alt="속보"
          style={{
            position: 'absolute',
            top: 28,
            right: 28,
            width: 160,
            height: 'auto',
            objectFit: 'contain',
            zIndex: 5,
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))'
          }}
        />
      )}

      {/* 키워드 — 드래그 가능 */}
      <Draggable
        position={kwPos}
        scale={scale}
        onDragEnd={(pos) => setCardData({ keywordPosition: pos })}
        zBase={6}
      >
        {isCover && coverTitleSegments && coverTitleSegments.length > 0 ? (
          <div
            style={{
              fontSize: keywordFontSize || 68,
              fontWeight: 900,
              lineHeight: 1.25,
              wordBreak: 'keep-all',
              whiteSpace: 'pre-wrap',
              textShadow: s.keywordShadow,
              maxWidth: CARD_SIZE * 0.88
            }}
          >
            {coverTitleSegments.map((seg, i) => (
              <span key={i} style={{ color: seg.color || s.keywordColor, marginRight: '0.2em' }}>
                {seg.text}
              </span>
            ))}
          </div>
        ) : (
          <div
            style={{
              fontSize: keywordFontSize || 68,
              fontWeight: isCover ? 900 : 800,
              color: s.keywordColor,
              textShadow: s.keywordShadow,
              lineHeight: 1.3,
              wordBreak: 'keep-all',
              whiteSpace: 'pre-wrap',
              maxWidth: CARD_SIZE * 0.88
            }}
          >
            {renderRichText(keyword)}
          </div>
        )}
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
