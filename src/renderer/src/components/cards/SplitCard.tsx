import type { CardData } from '@/types'
import { LAYOUT_STYLES } from '@/lib/cardTemplates'
import { CARD_SIZE, FONTS } from '@/lib/designTokens'

const s = LAYOUT_STYLES['split-layout']

export default function SplitCard({
  keyword,
  title,
  description,
  source,
  backgroundImageUrl
}: CardData) {
  return (
    <div
      style={{
        width: CARD_SIZE,
        height: CARD_SIZE,
        backgroundColor: s.outerBg,
        fontFamily: FONTS.heading,
        display: 'flex',
        flexDirection: 'column',
        padding: s.contentPadding
      }}
    >
      {/* 타이틀 영역 (좌측 보더 악센트) */}
      <div
        style={{
          borderLeft: `${s.titleBorderWidth}px solid ${s.titleBorderColor}`,
          paddingLeft: 24,
          marginBottom: 30
        }}
      >
        <div
          style={{
            fontSize: s.titleSize,
            fontWeight: 800,
            color: s.titleColor,
            lineHeight: 1.3,
            wordBreak: 'keep-all'
          }}
        >
          {keyword || title}
        </div>
      </div>

      {/* 설명문 */}
      <div
        style={{
          borderLeft: `${s.titleBorderWidth}px solid ${s.titleBorderColor}`,
          paddingLeft: 24,
          marginBottom: 24
        }}
      >
        <div
          style={{
            fontSize: s.descriptionSize + 4,
            fontWeight: 600,
            color: s.descriptionColor,
            lineHeight: 1.4,
            wordBreak: 'keep-all'
          }}
        >
          {title !== keyword ? title : ''}
        </div>
      </div>

      {/* 좌우 분할 영역 */}
      <div style={{ flex: 1, display: 'flex', gap: 30 }}>
        {/* 좌측: 설명 + 출처 */}
        <div
          style={{
            flex: `0 0 ${s.splitRatio.text}%`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: 16
          }}
        >
          {/* 설명 텍스트 바들 */}
          <div style={{ backgroundColor: '#E8F0F8', borderRadius: 4, height: 28, width: '90%' }} />
          <div style={{ backgroundColor: '#E8F0F8', borderRadius: 4, height: 28, width: '75%' }} />
          <div
            style={{
              fontSize: s.descriptionSize,
              color: s.descriptionColor,
              lineHeight: 1.6,
              marginTop: 8,
              wordBreak: 'keep-all'
            }}
          >
            {description}
          </div>
          {source && (
            <div
              style={{
                fontSize: s.sourceSize,
                color: s.sourceColor,
                marginTop: 'auto'
              }}
            >
              {source}
            </div>
          )}
        </div>

        {/* 우측: 이미지 */}
        <div
          style={{
            flex: `0 0 ${s.splitRatio.image}%`,
            borderRadius: s.imageBorderRadius,
            overflow: 'hidden',
            backgroundColor: '#E8F0F8'
          }}
        >
          {backgroundImageUrl ? (
            <img
              src={backgroundImageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              crossOrigin="anonymous"
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                color: '#AAA'
              }}
            >
              이미지
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
