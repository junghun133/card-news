import type { LayoutType } from '@/types'

export interface CardTemplate {
  id: LayoutType
  name: string
  description: string
  needsImage: boolean
}

export const CARD_TEMPLATES: Record<LayoutType, CardTemplate> = {
  'text-emphasis': {
    id: 'text-emphasis',
    name: '텍스트 강조형',
    description: '깔끔한 텍스트 중심',
    needsImage: false
  },
  'image-background': {
    id: 'image-background',
    name: '이미지 배경형',
    description: '이미지 + 오버레이',
    needsImage: true
  },
  'split-layout': {
    id: 'split-layout',
    name: '좌우 분할형',
    description: '텍스트 + 이미지',
    needsImage: true
  },
  'gradient-card': {
    id: 'gradient-card',
    name: '그라데이션형',
    description: '컬러풀 그라데이션',
    needsImage: false
  },
  'minimal-card': {
    id: 'minimal-card',
    name: '미니멀형',
    description: '깔끔 세련 디자인',
    needsImage: false
  }
}

export const LAYOUT_STYLES = {
  'text-emphasis': {
    outerBg: '#F5F0E8',
    cardBg: '#FFFFFF',
    keywordBoxBg: '#D6EAF8',
    keywordColor: '#1A1A2E',
    keywordSize: 72,
    descriptionColor: '#4A4A4A',
    descriptionSize: 32,
    sourceColor: '#888888',
    sourceSize: 20,
    cardPadding: 60,
    cardBorderRadius: 16
  },
  'image-background': {
    overlayGradient:
      'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
    fallbackBg: '#0D1117',
    keywordColor: '#FFFFFF',
    keywordSize: 64,
    keywordShadow: '2px 2px 8px rgba(0,0,0,0.5)',
    titleColor: '#E0E0E0',
    titleSize: 32,
    sourceColor: '#BBBBBB',
    sourceSize: 18,
    textPadding: 60
  },
  'split-layout': {
    outerBg: '#FFFFFF',
    titleBorderColor: '#2C7BE5',
    titleBorderWidth: 4,
    titleColor: '#1A1A2E',
    titleSize: 48,
    descriptionColor: '#333333',
    descriptionSize: 28,
    sourceColor: '#888888',
    sourceSize: 18,
    splitRatio: { text: 55, image: 45 },
    imageBorderRadius: 12,
    contentPadding: 50
  },
  'gradient-card': {
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    keywordColor: '#FFFFFF',
    keywordSize: 80,
    descriptionColor: 'rgba(255,255,255,0.85)',
    descriptionSize: 28
  },
  'minimal-card': {
    outerBg: '#FAFAFA',
    accentColor: '#1A1A2E',
    keywordColor: '#1A1A2E',
    keywordSize: 64,
    descriptionColor: '#666666',
    descriptionSize: 24
  }
} as const
