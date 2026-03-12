import { CARD_SIZE } from '@/lib/designTokens'
import type { CardData } from '@/types'

export default function MinimalCard(props: CardData) {
  return (
    <div
      style={{
        width: CARD_SIZE,
        height: CARD_SIZE,
        background: '#FAFAFA',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '100px 90px',
        fontFamily: "'Noto Sans KR', 'Pretendard', sans-serif",
        position: 'relative'
      }}
    >
      {/* 좌측 악센트 라인 */}
      <div
        style={{
          position: 'absolute',
          left: 50,
          top: 200,
          bottom: 200,
          width: 4,
          background: '#1A1A2E',
          borderRadius: 2
        }}
      />

      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: '#888888',
          textTransform: 'uppercase',
          letterSpacing: 4,
          marginBottom: 30
        }}
      >
        NEWS
      </div>

      <div
        style={{
          fontSize: 64,
          fontWeight: 900,
          color: '#1A1A2E',
          lineHeight: 1.15,
          marginBottom: 24
        }}
      >
        {props.keyword}
      </div>

      {props.title && (
        <div
          style={{
            fontSize: 30,
            fontWeight: 400,
            color: '#4A4A4A',
            marginBottom: 40,
            lineHeight: 1.5
          }}
        >
          {props.title}
        </div>
      )}

      <div
        style={{
          fontSize: 24,
          color: '#666666',
          lineHeight: 1.7,
          maxWidth: 750
        }}
      >
        {props.description}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 90,
          right: 90,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #E0E0E0',
          paddingTop: 20
        }}
      >
        <div style={{ fontSize: 16, color: '#888888' }}>
          {props.hashtags?.slice(0, 4).join('  ')}
        </div>
        <div style={{ fontSize: 14, color: '#AAAAAA' }}>{props.source}</div>
      </div>
    </div>
  )
}
