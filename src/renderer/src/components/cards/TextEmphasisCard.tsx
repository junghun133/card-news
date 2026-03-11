import type { CardData } from '@/types'
import { LAYOUT_STYLES } from '@/lib/cardTemplates'
import { CARD_SIZE, FONTS } from '@/lib/designTokens'

const s = LAYOUT_STYLES['text-emphasis']

export default function TextEmphasisCard({
  keyword,
  title,
  description,
  source,
  hashtags
}: CardData) {
  return (
    <div
      style={{
        width: CARD_SIZE,
        height: CARD_SIZE,
        backgroundColor: s.outerBg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONTS.heading,
        padding: 80
      }}
    >
      {/* 흰색 카드 */}
      <div
        style={{
          width: '100%',
          flex: 1,
          backgroundColor: s.cardBg,
          borderRadius: s.cardBorderRadius,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)'
        }}
      >
        {/* 키워드 박스 (상단 ~40%) */}
        <div
          style={{
            flex: '0 0 40%',
            backgroundColor: s.keywordBoxBg,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 50px'
          }}
        >
          <div
            style={{
              fontSize: s.keywordSize,
              fontWeight: 800,
              color: s.keywordColor,
              textAlign: 'center',
              lineHeight: 1.3,
              wordBreak: 'keep-all'
            }}
          >
            {keyword}
          </div>
          {title && title !== keyword && (
            <div
              style={{
                fontSize: 36,
                fontWeight: 500,
                color: s.descriptionColor,
                textAlign: 'center',
                marginTop: 16,
                lineHeight: 1.4
              }}
            >
              {title}
            </div>
          )}
        </div>

        {/* 설명 영역 (중단) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '30px 50px',
            gap: 16
          }}
        >
          {/* 설명 바들 */}
          <div
            style={{
              backgroundColor: '#E8F4FD',
              borderRadius: 6,
              padding: '14px 20px',
              width: '85%'
            }}
          />
          <div
            style={{
              backgroundColor: '#E8F4FD',
              borderRadius: 6,
              padding: '14px 20px',
              fontSize: s.descriptionSize,
              color: s.descriptionColor,
              lineHeight: 1.5,
              textAlign: 'center',
              wordBreak: 'keep-all'
            }}
          >
            {description}
          </div>
          <div
            style={{
              backgroundColor: '#E8F4FD',
              borderRadius: 6,
              padding: '14px 20px',
              width: '70%'
            }}
          />
        </div>

        {/* 출처/해시태그 (하단) */}
        <div
          style={{
            padding: '20px 50px 30px',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              fontSize: s.sourceSize,
              color: s.sourceColor,
              lineHeight: 1.6
            }}
          >
            {hashtags?.join(' ') || ''} {source ? `| ${source}` : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
