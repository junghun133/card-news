import type { CardData } from '@/types'
import { LAYOUT_STYLES } from '@/lib/cardTemplates'
import { CARD_SIZE, FONTS } from '@/lib/designTokens'
import { renderRichText } from '@/lib/renderRichText'

const s = LAYOUT_STYLES['top-bottom-split']

interface Props extends CardData {
  slideIndex: number
}

export default function TopBottomSplitCard({
  keyword,
  title,
  description,
  source,
  backgroundImageUrl,
  slideIndex,
  textBlocks,
  keywordFontSize,
  titleFontSize,
  descriptionFontSize
}: Props) {
  const imageHeight = CARD_SIZE * (s.imageSplitRatio / 100)
  const textHeight = CARD_SIZE - imageHeight
  const isCover = slideIndex === 0

  return (
    <div
      style={{
        width: CARD_SIZE,
        height: CARD_SIZE,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: FONTS.heading,
        backgroundColor: s.outerBg,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 상단: 이미지 */}
      <div
        style={{
          width: '100%',
          height: imageHeight,
          overflow: 'hidden',
          flexShrink: 0,
          backgroundColor: '#1a1a2e'
        }}
      >
        {backgroundImageUrl && (
          <img
            src={backgroundImageUrl}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            crossOrigin="anonymous"
          />
        )}
      </div>

      {/* 하단: 텍스트 */}
      <div
        style={{
          width: '100%',
          height: textHeight,
          padding: s.contentPadding,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 12,
          borderLeft: `${s.titleBorderWidth}px solid ${s.titleBorderColor}`,
          marginLeft: 20,
          paddingLeft: s.contentPadding - 20
        }}
      >
        {/* 키워드 */}
        <div
          style={{
            fontSize: keywordFontSize || (isCover ? s.keywordSize + 8 : s.keywordSize),
            fontWeight: 800,
            color: s.keywordColor,
            lineHeight: 1.25,
            wordBreak: 'keep-all',
            whiteSpace: 'pre-wrap'
          }}
        >
          {renderRichText(keyword)}
        </div>

        {/* 설명 */}
        {!isCover && description && (
          <div
            style={{
              fontSize: descriptionFontSize || s.descriptionSize,
              fontWeight: 400,
              color: s.descriptionColor,
              lineHeight: 1.6,
              wordBreak: 'keep-all',
              whiteSpace: 'pre-wrap'
            }}
          >
            {renderRichText(description)}
          </div>
        )}

        {/* 출처 */}
        {source && (
          <div
            style={{
              fontSize: s.sourceSize,
              color: s.sourceColor,
              marginTop: 4
            }}
          >
            {source}
          </div>
        )}
      </div>

      {/* 커스텀 텍스트 블록 오버레이 */}
      {textBlocks?.map((block) => (
        <div
          key={block.id}
          style={{
            position: 'absolute',
            left: `${block.x}%`,
            top: `${block.y}%`,
            fontSize: block.fontSize,
            fontWeight: block.fontWeight,
            color: block.color,
            maxWidth: `${block.maxWidth}%`,
            lineHeight: 1.4,
            wordBreak: 'keep-all',
            whiteSpace: 'pre-wrap',
            pointerEvents: 'none'
          }}
        >
          {block.content}
        </div>
      ))}
    </div>
  )
}
