import type { TopicSuggestion, CardData } from '@/types'

export const DUMMY_TOPICS: TopicSuggestion[] = [
  {
    id: '1',
    category: 'ai',
    title: 'GPT-5 출시 임박, AI 업계 지각변동 예고',
    summary: 'OpenAI가 차세대 모델 GPT-5를 올해 상반기 내 출시할 것으로 전망. 멀티모달 성능이 대폭 향상될 예정.',
    interestScore: 95,
    sourceCount: 5,
    relatedArticles: [
      { title: 'OpenAI GPT-5 개발 막바지', snippet: 'GPT-5는 기존 대비 추론 능력이 3배 향상될 것으로 예상', source: 'Reuters', url: '#', date: '2026-03-10' },
      { title: 'AI 경쟁 가속화, 구글도 Gemini 2.0 준비', snippet: '구글, 메타 등 빅테크 기업들의 AI 모델 경쟁 심화', source: 'Bloomberg', url: '#', date: '2026-03-09' },
      { title: 'AI 시장 규모 2026년 5000억 달러 돌파 전망', snippet: 'Gartner 보고서에 따르면 글로벌 AI 시장이 급성장 중', source: 'Gartner', url: '#', date: '2026-03-08' }
    ]
  },
  {
    id: '2',
    category: 'stocks',
    title: '엔비디아 시총 4조 달러 돌파, 사상 최고치',
    summary: 'AI 칩 수요 폭증에 힘입어 엔비디아 주가 연일 신고가. 시가총액 세계 1위 등극.',
    interestScore: 92,
    sourceCount: 4,
    relatedArticles: [
      { title: 'NVIDIA 주가 사상 최고치 경신', snippet: 'AI 데이터센터 투자 확대로 H200 칩 주문 폭주', source: 'CNBC', url: '#', date: '2026-03-10' },
      { title: '반도체 슈퍼사이클 진입', snippet: 'AI 반도체 시장이 메모리 반도체 시장을 추월', source: '한국경제', url: '#', date: '2026-03-09' }
    ]
  },
  {
    id: '3',
    category: 'war',
    title: '우크라이나-러시아 휴전 협상 재개 조짐',
    summary: '미국 중재 하에 양측 대표가 이스탄불에서 비공식 접촉. 영토 문제가 최대 쟁점.',
    interestScore: 88,
    sourceCount: 6,
    relatedArticles: [
      { title: '우크라 휴전 협상 물밑 접촉 활발', snippet: '미국과 유럽이 공동 중재안을 마련 중인 것으로 알려져', source: 'AP', url: '#', date: '2026-03-10' },
      { title: '러시아, 조건부 협상 의사 표명', snippet: '크림반도 문제를 별도 협의하는 조건으로 대화 의사 밝혀', source: 'Reuters', url: '#', date: '2026-03-09' },
      { title: '젤렌스키 "평화는 원하지만 영토는 포기 못해"', snippet: '우크라이나 대통령이 국민 연설에서 원칙적 입장 재확인', source: 'BBC', url: '#', date: '2026-03-09' }
    ]
  },
  {
    id: '4',
    category: 'ai',
    title: '삼성전자, AI 온디바이스 칩 갤럭시 S26에 탑재',
    summary: '삼성이 자체 개발 AI 프로세서를 차기 플래그십에 탑재. 클라우드 없이도 AI 기능 구동 가능.',
    interestScore: 85,
    sourceCount: 3,
    relatedArticles: [
      { title: '삼성 엑시노스 AI 칩 성능 공개', snippet: '온디바이스 LLM 추론 속도가 기존 대비 5배 향상', source: '조선일보', url: '#', date: '2026-03-10' },
      { title: '모바일 AI 시대 본격 개막', snippet: '애플, 구글에 이어 삼성도 온디바이스 AI 경쟁 합류', source: 'TechCrunch', url: '#', date: '2026-03-08' }
    ]
  },
  {
    id: '5',
    category: 'stocks',
    title: '비트코인 10만 달러 재돌파, 기관투자자 유입 가속',
    summary: 'BTC ETF 자금 유입이 역대 최고치를 기록하며 비트코인이 다시 10만 달러를 넘어섬.',
    interestScore: 82,
    sourceCount: 4,
    relatedArticles: [
      { title: '비트코인 ETF 순유입 100억 달러 돌파', snippet: 'BlackRock, Fidelity 등 대형 운용사의 BTC ETF에 자금 유입 지속', source: 'CoinDesk', url: '#', date: '2026-03-10' },
      { title: '암호화폐 시장 3조 달러 재돌파', snippet: '비트코인 랠리에 알트코인도 동반 상승', source: 'Bloomberg', url: '#', date: '2026-03-09' }
    ]
  }
]

export const DUMMY_CARD_DATA: CardData = {
  keyword: 'GPT-5 출시',
  title: 'AI 업계 최대 지각변동',
  description:
    'OpenAI의 차세대 모델 GPT-5가 올해 상반기 출시 예정. 멀티모달 성능 대폭 향상으로 AI 산업 전반에 변화가 예상됩니다.',
  source: '출처: Reuters, Bloomberg, Gartner 종합',
  hashtags: ['#AI', '#GPT5', '#인공지능', '#OpenAI', '#테크뉴스'],
  backgroundImageUrl:
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1080&h=1080&fit=crop',
  caption:
    'OpenAI가 차세대 AI 모델 GPT-5를 올해 상반기 출시할 예정입니다. 기존 대비 추론 능력 3배 향상, 멀티모달 성능 대폭 개선이 예상됩니다.\n\n#AI #GPT5 #인공지능 #OpenAI #테크뉴스 #카드뉴스 #뉴스'
}

export const DUMMY_IMAGES = [
  'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=400&fit=crop'
]
