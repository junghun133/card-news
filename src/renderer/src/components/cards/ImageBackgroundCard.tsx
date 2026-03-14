import type { CardData } from '@/types'
import { LAYOUT_STYLES } from '@/lib/cardTemplates'
import { CARD_SIZE, FONTS } from '@/lib/designTokens'
import { renderRichText } from '@/lib/renderRichText'
import { PROFILE_ICON_SVG } from '@/lib/profileIcon'
import newsIcon from '@/assets/news_icon.png'

const s = LAYOUT_STYLES['image-background']

interface Props extends CardData {
  slideIndex: number
  totalSlides?: number
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
  descriptionFontSize
}: Props) {
  const isCover = slideIndex === 0

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
          {/* 프로필 아이콘 */}
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              overflow: 'hidden'
            }}
          >
            <img
              src={PROFILE_ICON_SVG}
              alt="profile"
              style={{ width: 130, height: 130, objectFit: 'contain' }}
            />
          </div>

          {/* 아이디 */}
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

          {/* 구분선 */}
          <div
            style={{
              width: 80,
              height: 3,
              background: 'linear-gradient(90deg, #FFE066, #FF6B6B)',
              borderRadius: 2
            }}
          />

          {/* 소개글 */}
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

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: s.textPadding,
          display: 'flex',
          flexDirection: 'column',
          gap: isCover ? 20 : 16
        }}
      >
        {isCover && coverTitleSegments && coverTitleSegments.length > 0 ? (
          <div
            style={{
              fontSize: keywordFontSize || s.coverKeywordSize,
              fontWeight: 900,
              lineHeight: 1.25,
              wordBreak: 'keep-all',
              whiteSpace: 'pre-wrap',
              textShadow: s.keywordShadow
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
              fontSize: keywordFontSize || (isCover ? s.coverKeywordSize : s.keywordSize),
              fontWeight: isCover ? 900 : 800,
              color: s.keywordColor,
              textShadow: s.keywordShadow,
              lineHeight: 1.3,
              wordBreak: 'keep-all',
              whiteSpace: 'pre-wrap'
            }}
          >
            {renderRichText(keyword)}
          </div>
        )}

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

        {source && (
          <div style={{ fontSize: s.sourceSize, color: s.sourceColor, marginTop: 8 }}>
            {source}
          </div>
        )}
      </div>

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
            textShadow: '1px 1px 4px rgba(0,0,0,0.5)',
            pointerEvents: 'none'
          }}
        >
          {block.content}
        </div>
      ))}
    </div>
  )
}
