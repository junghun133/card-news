import React from 'react'

/**
 * {{텍스트}} → 노란 배경 강조
 * [[텍스트]] → 빨간 글씨 강조
 * 일반 텍스트 → 그대로
 */
export function renderRichText(
  text: string,
  baseStyle?: React.CSSProperties
): React.ReactNode {
  if (!text) return null

  // {{yellow}} 와 [[red]] 마커를 파싱
  const regex = /(\{\{[^}]+\}\}|\[\[[^\]]+\]\])/g
  const parts = text.split(regex)

  if (parts.length === 1) {
    // 마커가 없으면 그대로 반환
    return text
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('{{') && part.endsWith('}}')) {
          const content = part.slice(2, -2)
          return (
            <span
              key={i}
              style={{
                background: '#FFE066',
                color: '#1A1A2E',
                padding: '2px 8px',
                borderRadius: 4,
                fontWeight: 700,
                boxDecorationBreak: 'clone' as any
              }}
            >
              {content}
            </span>
          )
        }

        if (part.startsWith('[[') && part.endsWith(']]')) {
          const content = part.slice(2, -2)
          return (
            <span
              key={i}
              style={{
                color: '#4A90FF',
                fontWeight: 700
              }}
            >
              {content}
            </span>
          )
        }

        return <React.Fragment key={i}>{part}</React.Fragment>
      })}
    </>
  )
}
