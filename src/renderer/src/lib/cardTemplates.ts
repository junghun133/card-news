import type { LayoutType } from '@/types'

export interface CardTemplate {
  id: LayoutType
  name: string
  description: string
  needsImage: boolean
}

export const CARD_TEMPLATES: Record<LayoutType, CardTemplate> = {
  'image-background': {
    id: 'image-background',
    name: '이미지 배경형',
    description: '이미지 위에 텍스트 오버레이',
    needsImage: true
  },
  'top-bottom-split': {
    id: 'top-bottom-split',
    name: '상하 분할형',
    description: '상단 이미지 + 하단 텍스트',
    needsImage: true
  }
}

export const LAYOUT_STYLES = {
  'image-background': {
    // 커버 카드용 (slideIndex === 0) — 강한 하단 그라데이션
    coverOverlayGradient:
      'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.35) 60%, transparent 100%)',
    // 본문 카드용 — 표준 그라데이션
    overlayGradient:
      'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0.3) 60%, transparent 100%)',
    fallbackBg: '#0D1117',
    keywordColor: '#FFFFFF',
    coverKeywordSize: 72,
    keywordSize: 48,
    keywordShadow: '2px 2px 8px rgba(0,0,0,0.5)',
    titleColor: '#E0E0E0',
    titleSize: 28,
    descriptionColor: '#F0F0F0',
    descriptionSize: 26,
    sourceColor: '#BBBBBB',
    sourceSize: 18,
    textPadding: 60
  },
  'top-bottom-split': {
    outerBg: '#FFFFFF',
    titleBorderColor: '#2C7BE5',
    titleBorderWidth: 4,
    keywordColor: '#1A1A2E',
    keywordSize: 44,
    titleColor: '#333333',
    titleSize: 30,
    descriptionColor: '#444444',
    descriptionSize: 26,
    sourceColor: '#888888',
    sourceSize: 18,
    imageSplitRatio: 50,
    contentPadding: 40
  }
} as const
