import { CARD_SIZE } from '@/lib/designTokens'
import type { CardData } from '@/types'

export default function GradientCard(props: CardData) {
  return (
    <div
      style={{
        width: CARD_SIZE,
        height: CARD_SIZE,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 80,
        textAlign: 'center',
        fontFamily: "'Noto Sans KR', 'Pretendard', sans-serif"
      }}
    >
      <div
        style={{
          fontSize: 80,
          fontWeight: 900,
          color: '#FFFFFF',
          lineHeight: 1.2,
          marginBottom: 30,
          textShadow: '2px 4px 12px rgba(0,0,0,0.3)'
        }}
      >
        {props.keyword}
      </div>

      {props.title && (
        <div
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.9)',
            marginBottom: 40,
            lineHeight: 1.4
          }}
        >
          {props.title}
        </div>
      )}

      <div
        style={{
          width: 60,
          height: 3,
          background: 'rgba(255,255,255,0.5)',
          borderRadius: 2,
          marginBottom: 40
        }}
      />

      <div
        style={{
          fontSize: 28,
          color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.6,
          maxWidth: 800
        }}
      >
        {props.description}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 50,
          left: 80,
          right: 80,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)' }}>
          {props.hashtags?.slice(0, 3).join(' ')}
        </div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>{props.source}</div>
      </div>
    </div>
  )
}
