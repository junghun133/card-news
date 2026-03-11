import type { CardData } from '@/types'
import { LAYOUT_STYLES } from '@/lib/cardTemplates'
import { CARD_SIZE, FONTS } from '@/lib/designTokens'

const s = LAYOUT_STYLES['image-background']

export default function ImageBackgroundCard({
  keyword,
  title,
  source,
  backgroundImageUrl
}: CardData) {
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
      {/* 배경 이미지 */}
      {backgroundImageUrl && (
        <img
          src={backgroundImageUrl}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          crossOrigin="anonymous"
        />
      )}

      {/* 그래디언트 오버레이 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: s.overlayGradient
        }}
      />

      {/* 텍스트 영역 (하단) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: s.textPadding,
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}
      >
        <div
          style={{
            fontSize: s.keywordSize,
            fontWeight: 800,
            color: s.keywordColor,
            textShadow: s.keywordShadow,
            lineHeight: 1.3,
            wordBreak: 'keep-all'
          }}
        >
          {keyword}
        </div>
        {title && (
          <div
            style={{
              fontSize: s.titleSize,
              fontWeight: 400,
              color: s.titleColor,
              lineHeight: 1.5,
              wordBreak: 'keep-all'
            }}
          >
            {title}
          </div>
        )}
        {source && (
          <div
            style={{
              fontSize: s.sourceSize,
              color: s.sourceColor,
              marginTop: 8
            }}
          >
            {source}
          </div>
        )}
      </div>
    </div>
  )
}
