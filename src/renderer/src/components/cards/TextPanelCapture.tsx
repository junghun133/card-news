import { forwardRef } from 'react'
import { CARD_SIZE, FONTS } from '@/lib/designTokens'
import { renderRichText } from '@/lib/renderRichText'

/** 1080×432 텍스트 패널 (캡처 전용, 오프스크린) — 흰색 배경 + 강조 텍스트 */
const TextPanelCapture = forwardRef<
  HTMLDivElement,
  { keyword: string; description: string; slideIndex: number }
>(function TextPanelCapture({ keyword, description }, ref) {
  const panelHeight = Math.round(CARD_SIZE * 0.4) // 432px (40%)

  return (
    <div
      ref={ref}
      style={{
        width: CARD_SIZE,
        height: panelHeight,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: FONTS.heading,
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 5%'
      }}
    >
      {/* 키워드 — {{}} 노란배경, [[]] 파란글자 적용 */}
      <div
        style={{
          fontSize: 60,
          fontWeight: 800,
          color: '#1A1A2E',
          lineHeight: 1.25,
          wordBreak: 'keep-all' as const,
          whiteSpace: 'pre-wrap' as const,
          maxWidth: CARD_SIZE * 0.88,
          marginBottom: 16
        }}
      >
        {renderRichText(keyword)}
      </div>

      {/* 설명 — {{}} 노란배경, [[]] 파란글자 적용 */}
      {description && (
        <div
          style={{
            fontSize: 30,
            fontWeight: 400,
            color: '#444444',
            lineHeight: 1.55,
            wordBreak: 'keep-all' as const,
            whiteSpace: 'pre-wrap' as const,
            maxWidth: CARD_SIZE * 0.88
          }}
        >
          {renderRichText(description)}
        </div>
      )}
    </div>
  )
})

export default TextPanelCapture
