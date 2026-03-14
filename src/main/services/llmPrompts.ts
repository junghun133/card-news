import { parseArticleDate } from './serper'

// ─── 공통 타입 ───

export interface ArticleInput {
  title: string
  snippet: string
  fullText?: string
  source: string
  url: string
  date: string
  provider?: string
}

export type TopicCategory = 'ai' | 'stocks' | 'war' | 'economy' | 'tech' | 'society' | 'science'

export interface TopicResult {
  id: string
  category: TopicCategory
  title: string
  summary: string
  interestScore: number
  sourceCount: number
}

export interface SlideResult {
  keyword: string
  title: string
  description: string
  slideImageQuery?: string
}

export interface CardResult {
  slides: SlideResult[]
  sourceAttribution: string
  hashtags: string[]
  imageKeywords: string[]
}

export interface SuggestTopicsResult {
  topics: TopicResult[]
  inputArticles: ArticleInput[]
}

// ─── 공통 유틸 ───

/**
 * 상대 날짜("2시간 전", "3일 전")를 실제 날짜 문자열("2026년 3월 14일")로 변환
 */
export function formatArticleDate(dateStr: string): string {
  if (!dateStr) return ''
  const parsed = parseArticleDate(dateStr)
  if (!parsed) return dateStr
  return `${parsed.getFullYear()}년 ${parsed.getMonth() + 1}월 ${parsed.getDate()}일`
}

/**
 * 기사 배열을 셔플+트림하고 텍스트로 변환
 */
export function prepareArticlesForTopics(articles: ArticleInput[], maxCount = 30) {
  const shuffled = [...articles].sort(() => Math.random() - 0.5)
  const trimmed = shuffled.slice(0, maxCount)
  const articlesText = trimmed
    .map(
      (a, i) =>
        `[${i + 1}] ${a.source} (${a.date})\n제목: ${a.title}\n내용: ${a.snippet.slice(0, 100)}`
    )
    .join('\n---\n')
  return { trimmed, articlesText }
}

/**
 * 기사 배열을 카드 생성용 텍스트로 변환
 */
export function buildArticlesText(articles: ArticleInput[], maxCount = 10): string {
  return articles
    .slice(0, maxCount)
    .map((a, i) => {
      const body = a.fullText || a.snippet
      const dateLabel = formatArticleDate(a.date) || a.date
      return `[${i + 1}] ${a.source} (${dateLabel})\n제목: ${a.title}\n내용: ${body.slice(0, 2000)}`
    })
    .join('\n---\n')
}

/**
 * 기사에서 숫자를 추출하여 힌트 문자열 생성
 */
export function buildNumbersHint(articles: ArticleInput[]): string {
  const numberPattern = /[\d,.]+\s*(?:%|조|억|만|원|달러|개|명|년|월|일|배|위|호|연속|포인트|bp|건|곳|차례|기|대|회|분기|세)/g
  const extractedNumbers = new Set<string>()
  for (const a of articles) {
    const text = a.title + ' ' + (a.fullText || a.snippet)
    const matches = text.match(numberPattern) || []
    matches.forEach((m) => extractedNumbers.add(m.trim()))
  }
  const numbersList = [...extractedNumbers].slice(0, 20).join(', ')
  return numbersList
    ? `\n\n📊 기사에서 추출한 실제 숫자 ({{}}에 숫자 쓸 때 이 목록에서만!): ${numbersList}`
    : ''
}

/**
 * 카드 생성 사용자 프롬프트 생성
 */
export function buildCardUserPrompt(topic: string, articlesText: string, numbersHint: string): string {
  return `주제: ${topic}\n\n관련 기사:\n${articlesText}${numbersHint}\n\n위 예시처럼 작성해줘! 🔴 반드시 지킬 규칙:\n1. 기사 본문에서 구체적 기능명, 숫자, 사례, 인물발언을 먼저 전부 뽑고, 그걸 카드에 반영!\n2. 🔴🔴 모든 슬라이드의 keyword에 반드시 {{}} 포함! (예: "{{Ask Maps}}", "{{300억 달러}}") — {{}} 없는 keyword는 탈락!\n3. 🔴🔴 keyword에 물음표(?) 절대 금지! 서술문만!\n4. description 문장은 20~35자! 한 문장에 구체적 정보(기능명, 숫자, 사례) 1개씩!\n5. 카드1~4: 질문 절대 금지! 질문은 카드5 description 마지막 줄에만 1개!\n6. [[]] = 감정/충격 단어만. 5장 전체에서 같은 [[]] 반복 금지!\n7. 본문 3장(카드2~4)은 서로 다른 관점! (핵심 기능 → 구체적 사례/수치 → 산업 영향)\n8. slideImageQuery: 뉴스 관련 구체적 영어 키워드 3~5단어!\n9. 🔴🔴🔴 description에서 {{}}는 슬라이드당 최대 2~3개! 한 줄에 {{}} 1개만! 나머지 숫자/이름은 그냥 텍스트로!`
}

/**
 * 캡션 생성 사용자 프롬프트 생성
 */
export function buildCaptionUserPrompt(
  cardData: { keyword: string; title: string; description: string },
  articles?: ArticleInput[]
): string {
  let articlesContext = ''
  if (articles && articles.length > 0) {
    articlesContext = articles
      .slice(0, 8)
      .map((a, i) => {
        const body = a.fullText || a.snippet
        const dateLabel = formatArticleDate(a.date) || a.date
        return `[${i + 1}] ${a.source} (${dateLabel}): ${a.title}\n${body.slice(0, 1500)}`
      })
      .join('\n---\n')
  }
  return `카드뉴스 주제: ${cardData.keyword}\n제목: ${cardData.title}\n카드 내용 요약: ${cardData.description}${articlesContext ? `\n\n참고 기사 원문:\n${articlesContext}` : ''}\n\n위 정보를 바탕으로 인스타그램 본문 캡션을 500자 이상으로 작성해줘. 기사에서 발췌한 구체적 정보(숫자, 인물, 기관, 날짜)를 풍부하게 포함해!`
}

// ─── 생성된 슬라이드 검증 & 자동 수정 ───

/**
 * keyword에 {{}} 없으면 자동 래핑, 물음표 제거, 보도체→존댓말 변환
 */
export function validateAndFixSlides(slides: any[]): void {
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]
    const isLastSlide = i === slides.length - 1
    const isCover = i === 0

    // 1. keyword에 {{}} 없으면 자동 래핑
    if (slide.keyword && !slide.keyword.includes('{{')) {
      const kw = slide.keyword.trim()
      if (!isCover) {
        slide.keyword = `{{${kw}}}`
      } else {
        const words = kw.split(/[\s,!.\n"]+/).filter((w: string) => w.length >= 2)
        if (words.length > 0) {
          const target = words[0]
          slide.keyword = kw.replace(target, `{{${target}}}`)
        }
      }
      console.log(`[Validate] Slide ${i + 1}: keyword에 {{}} 자동 추가 → "${slide.keyword}"`)
    }

    // 2. keyword에 물음표 제거
    if (slide.keyword && slide.keyword.includes('?')) {
      slide.keyword = slide.keyword.replace(/\?/g, '!').replace(/는요!/g, '!').replace(/나요!/g, '!')
      console.log(`[Validate] Slide ${i + 1}: keyword 물음표 제거 → "${slide.keyword}"`)
    }

    // 3. title에서 보도체 → 존댓말 변환
    if (slide.title) {
      slide.title = fixFormality(slide.title)
    }

    // 4. 본문(카드1~4)의 description에서 질문 제거
    if (!isLastSlide && slide.description) {
      slide.description = removeQuestions(slide.description)
    }
  }
}

/** 보도체(~ㅂ니다, ~것이다) → 존댓말(~이에요) 변환 */
export function fixFormality(text: string): string {
  return text
    .replace(/합니다/g, '해요')
    .replace(/됩니다/g, '돼요')
    .replace(/입니다/g, '이에요')
    .replace(/습니다/g, '어요')
    .replace(/것이다/g, '거예요')
}

/** 본문 슬라이드에서 질문 문장 제거 */
export function removeQuestions(description: string): string {
  const lines = description.split('\n')
  const fixed = lines.map((line) => {
    if (/[?？]/.test(line)) {
      return line
        .replace(/할까요\?/g, '해요.')
        .replace(/일까요\?/g, '이에요.')
        .replace(/인가요\?/g, '이에요.')
        .replace(/는요\?/g, '예요.')
        .replace(/나요\?/g, '아요.')
        .replace(/세요\?/g, '세요.')
        .replace(/[?？]/g, '.')
    }
    return line
  })
  return fixed.join('\n')
}

// ─── 프롬프트 ───

export const VALID_CATEGORIES = ['ai', 'tech', 'stocks', 'economy', 'war', 'society', 'science']

export function getSuggestTopicsSystemPrompt(): string {
  return `너는 한국어 뉴스 분석가야. 주어진 뉴스 기사들을 분석하여 카드뉴스로 만들기 좋은 흥미로운 주제 5-10개를 추천해줘.

**매우 중요: 주제 다양성**
- 추천하는 5-10개 주제는 반드시 서로 다른 분야에서 골고루 뽑아야 해!
- AI/기술 주제에 편중하지 말고, 경제·사회·국제·과학 등 다양한 분야를 균형있게 추천해.
- 같은 분야(category)의 주제는 최대 3개까지만 허용.

**카테고리 분류 (7종):**
- ai: 인공지능, ChatGPT, 생성AI, 머신러닝
- tech: IT, 반도체, 스마트폰, 통신, 자율주행, 로봇 (AI 아닌 기술)
- stocks: 주식, 코스피, 나스닥, 투자, 코인
- economy: 경제, 금리, 환율, 부동산, 고용, 물가, GDP
- war: 전쟁, 군사, 국제정세, 외교, 안보
- society: 사회, 정책, 교육, 의료, 환경, 문화, 범죄
- science: 과학, 우주, 의학, 연구, 발견

**인기도 평가 기준** (interestScore에 반영):
1. 여러 매체에서 동시에 다루는 주제일수록 높은 점수
2. 구체적 수치/데이터가 포함된 기사일수록 높은 점수
3. 사회적 파급력이 큰 주제 우선
4. 최신 기사(오늘/어제)가 과거 기사보다 높은 점수

반드시 아래 JSON 형식으로만 응답해:
{
  "topics": [
    {
      "title": "주제 제목 (20자 이내, 임팩트 있게)",
      "summary": "한줄 요약 (50자 이내)",
      "interestScore": 0-100,
      "sourceCount": 관련 기사 수,
      "relatedArticleIndices": [1, 2, 3],
      "category": "ai|tech|stocks|economy|war|society|science"
    }
  ]
}
category는 반드시 위 7개 중 하나. 같은 category 주제는 3개 이하!
기사가 많으면 최대 10개 주제를 추천해. 비슷한 기사는 하나의 주제로 묶어.`
}

export function getGenerateCardSystemPrompt(): string {
  return `[역할] 인스타 수만 팔로워 보유 콘텐츠 디렉터 + UX 라이터.
[목표] 뉴스 기사 → 끝까지 넘겨보게 만드는 카드뉴스 대본 변환. 기사 본문에서 구체적 정보(기능명, 수치, 사례, 인물발언)를 최대한 추출하여 정보 밀도 높은 카드를 만들어!

**[🔴 Step 0 — 기사 본문에서 핵심 정보 추출!]**
카드를 쓰기 전에, 기사 본문을 꼼꼼히 읽고 아래 정보를 전부 추출해:
1. **구체적 기능/서비스명**: 예) "Ask Maps", "제미나이 2.0", "Space Ribbon" 등 고유 기능명
2. **구체적 숫자**: 금액, 비율, 인원, 기간, 순위, 증감
3. **구체적 사례/예시**: "줄 서지 않고 충전할 수 있는 곳을 추천" 같은 실제 사용 시나리오
4. **인물 발언/결정**: 누가 무엇을 발표/결정했는지
5. **비교 데이터**: 이전 vs 이후, 경쟁사 비교 등
→ 이 정보들을 카드 5장에 골고루 배분! 추상적 문장 금지, 구체적 팩트만!

**[🔴 Step 1 — 기사에서 숫자를 먼저 전부 뽑아!]**
→ 찾은 숫자를 카드 전체에 골고루 배분! 한 카드에 몰지 말고 매 카드 1~2개씩!
→ "4연속" → {{4연속}}, "2.50%" → {{2.50%}}, "27일" → {{27일}} 전부 활용!

**[🔴 Step 2 — {{}}는 핵심 정보 강조! 남용 금지!]**
- {{}} = 노란 배경. 너무 많으면 오히려 읽기 힘들어짐!
- 🔴🔴🔴 description에서 {{}}는 슬라이드당 최대 2~3개만! 가장 중요한 숫자/고유명사만 강조!
  ✅ 좋은 예: "{{삼성전자}}가 미국 텍사스에 300억 달러를 투자했어요.\n한화로 약 {{40조원}} 규모, 역대 최대 해외 투자액이죠."
  ❌ 나쁜 예: "{{삼성전자}}가 {{미국}} {{텍사스}}에 {{300억 달러}}를 {{투자}}했어요." ← {{}} 범벅!
- 한 줄에 {{}} 최대 1개! 같은 줄에 2개 이상 금지!
  ❌ "{{LIG넥스원}} 주가는 {{47%}}나 폭등했어요." ← 한 줄에 2개
  ✅ "{{LIG넥스원}} 주가가 크게 폭등했어요.\n무려 47%나 뛴 [[역대급]] 상승 폭이죠."
- 강조 우선순위: ① 핵심 숫자(금액,비율) > ② 핵심 고유명사(기업,기술명) > ③ 기능명
  ✅ {{300억 달러}}, {{54%}}, {{TSMC}}
  ❌ 맥락상 안 중요한 일반어: {{필수}}, {{위기}}, {{중요}}, {{필요}}, {{혁신}}, {{대전환}}
- 🔴🔴🔴 keyword 필드에도 반드시 {{}} 포함! 모든 슬라이드의 keyword에 {{}} 1개 이상!
- 기사 원문 숫자가 있으면 {{숫자}}를 우선 사용!
- ❌ 기사에 없는 숫자 날조 절대 금지!

**[🔴 Step 3 — [[]]는 감정/충격 단어만!]**
- [[]] = 파란 글씨. 감정·충격·반전 단어에만 사용!
  ✅ [[격추]], [[폭락]], [[역대급]], [[전쟁]], [[비상]], [[혁명]]
  ❌ [[NATO]], [[미국]], [[한국은행]] ← 고유명사는 {{}}로!
- 슬라이드당 [[]] 최대 1개. 남발하면 효과 사라짐!
- 🔴 5장 전체에서 같은 [[]] 단어 반복 금지! 매 슬라이드 다른 감정 단어 사용!

**[🔴🔴🔴 keyword 필드 규칙 — 가장 중요!]**
- keyword는 카드에서 가장 크게 보이는 메인 텍스트!
- 🔴 모든 슬라이드의 keyword에 반드시 {{}} 1개 이상 포함!
  ✅ "{{300억 달러}}", "{{TSMC}} {{54%}}", "{{Ask Maps}}"
  ❌ "제미나이", "AI의 미래는요?", "구글의 미래" ← {{}} 없으면 탈락!
- keyword는 물음표(?) 금지! 서술문만!
  ❌ "AI의 미래는요?", "어떻게 될까요?"
  ✅ "{{AI}} 시대가 온다!", "{{제미나이}} 전면 도입!"

**[스타일]**
- description 문장은 20~35자! 너무 짧으면(10자 이하) 안 됨!
  ❌ "구글은 제미나이를 통해" (13자, 정보 없음)
  ✅ "구글이 '제미나이' AI를 지도에 전면 탑재했어요." (24자, 정보 있음)
- 한 문장에 구체적 정보(기능명, 숫자, 사례) 1개씩 담기!
  ❌ "사용자의 복잡한 요구를 이해해요." (추상적)
  ✅ "'줄 안 서는 EV 충전소 추천해줘'도 가능해요." (구체적 사례)
- 비유는 극단적: "어려워졌어요" ❌ → "불타고 있어요" ✅
- 존댓말 기반. 반말(~해,~야,~지)/보도체(~됩니다,~것이다) 절대금지.

**[🔴🔴 어미 다양화 — 매우 중요!]**
- "~해요"/"~했어요" 연속 사용 금지! 5~6줄 중 같은 어미는 최대 2번!
- 반드시 다양한 어미를 섞어 사용:
  ✅ ~이에요 / ~예요 / ~이죠 / ~거예요 / ~는 거예요 / ~인 셈이에요 / ~인 상황이에요
  ✅ ~었던 거예요 / ~한 건데요 / ~래요 / ~답니다(극히 드물게) / ~나 봐요
  ✅ 명사형 종결: "무려 {{300억 달러}} 규모." / "역대 최대 투자액."
- ❌ 나쁜 예 (어미 반복):
  "피해자가 소송을 냈어요. 인당 30만원을 요구했어요. 불법행위도 포함됐어요. 첫 변론이 열렸어요. 재판 지연을 시도했어요."
- ✅ 좋은 예 (어미 다양):
  "{{1998명}}의 피해자가 집단소송에 나섰어요.\n인당 {{30만원}}의 위자료를 요구하는 건데요.\n유출 후 100일간 추가 불법행위까지 포함된 상황이에요.\n3월 13일, 서울중앙지법에서 첫 변론이 시작됐죠.\n쿠팡 측은 행정소송 후 진행하자며 시간 끌기에 나선 셈이에요."

**[🔴🔴🔴 질문 절대 금지!]**
- keyword에 질문(?) 절대 금지!
- 카드1~4: 질문("~할까요?", "~일까요?", "~는요?", "어떻게 생각하세요?") 절대 금지!
- 질문은 카드5 description 마지막 줄에만 딱 1개! (댓글 유도용)
- 심리 설득은 단정문으로! ✅ "뒤처져요." "안 알려줘요." / ❌ "뒤처질까요?" "알고 있나요?"

**[출력 구성 — 반드시 5장!]**
- 카드1 (표지): keyword=창의적 메인 타이틀(반드시 {{}} 포함!), title=호기심 서브 타이틀(서술문!). description="".
- 카드2~4 (본문 3장): keyword=핵심 수치/기능명(반드시 {{}} 포함!), title=부제목(15자이내, 서술문!), description=줄바꿈(\\n)으로 20~35자 문장 5~6줄. 한 문장에 구체적 정보 1개씩!
  🔴 3장은 서로 다른 관점/각도! (예: 핵심 기능 소개 → 구체적 사례/수치 → 산업 영향/전망)
  🔴 기사 본문에서 뽑은 구체적 기능명, 숫자, 사례를 반드시 포함!
- 카드5 (결론): 핵심 요약 + description 마지막에 독자 질문 1개 (댓글 유도).

**slideImageQuery:**
- 뉴스 내용과 관련된 구체적 영어 키워드 3~5단어!
  ✅ "Google Maps app smartphone navigation", "semiconductor factory construction", "stock market trading floor"
  ❌ "golden meteor crashing desert", "futuristic AI brain" ← Unsplash에서 결과 안 나옴!
- 각 슬라이드마다 다른 키워드로 다양한 이미지!
- 🔴 표지 slideImageQuery: 주제를 대표하는 상징적 이미지!

JSON: {"slides":[{"keyword":"...","title":"...","description":"...","slideImageQuery":"..."}],"sourceAttribution":"출처: ...","hashtags":["#..."],"imageKeywords":["..."]}`
}

export function getGenerateCardFewShot(): { user: string; assistant: string } {
  const user = `주제: 삼성전자 300억 달러 반도체 투자\n\n관련 기사:\n[1] 한국경제 (2시간 전)\n제목: 삼성전자, 미국 텍사스에 300억 달러 반도체 공장 투자 확정\n내용: 삼성전자가 미국 텍사스주 테일러시에 300억 달러 규모의 반도체 파운드리 공장을 건설한다. 기존 170억 달러 투자 계획에서 대폭 확대되었다.\n---\n[2] 매일경제 (3시간 전)\n제목: 삼성 반도체 투자에 텍사스주 1만7천 고용 기대\n내용: 텍사스주는 삼성전자의 투자로 1만7천여 개의 직간접 일자리가 창출될 것으로 예상했다. 바이든 대통령도 환영 성명을 발표했다.`

  const assistant = JSON.stringify({
    slides: [
      { keyword: "\"{{삼성전자}} {{40조}} 올인!\"\n반도체판이 뒤집어져요!", title: "", description: "", slideImageQuery: "Samsung semiconductor factory Texas aerial view" },
      { keyword: "{{300억 달러}}", title: "", description: "{{삼성전자}}가 미국 텍사스 테일러시에 300억 달러를 베팅했어요.\n한화로 약 {{40조원}}, 아파트 1만 채를 살 수 있는 규모죠.\n원래 170억 달러 계획이었는데 거의 2배로 뛴 건데요.\n3나노 파운드리 공장 건설이 핵심 목표예요.\n역대 한국 기업 최대 해외 투자액.", slideImageQuery: "massive construction site industrial cranes" },
      { keyword: "{{TSMC}} 독주 체제", title: "", description: "세계 반도체 위탁생산 1위 {{TSMC}}의 점유율은 54%.\n삼성전자는 18%로 격차가 3배 가까이 벌어진 상황이에요.\n미국 현지에 첨단 공장 없이는 경쟁이 [[불가능]]하죠.\nIBM, 퀄컴 등 미국 빅테크 수주를 노리는 건데요.\n지금 안 뛰면 격차가 돌이킬 수 없이 벌어지는 셈이에요.", slideImageQuery: "semiconductor chip closeup technology manufacturing" },
      { keyword: "일자리 {{1만7천 개}}", title: "", description: "텍사스주에 직간접 일자리 {{1만7천 개}}가 새로 생기는 규모예요.\n바이든 대통령이 직접 환영 성명을 발표했을 정도죠.\n연방 보조금에 세금 감면까지 [[몰아주는]] 특별 대우.\n미국의 '반도체 자국 생산' 전략 핵심으로 자리잡은 건데요.\n한국 기업이 미국 제조업 지형을 바꾸고 있는 셈이에요.", slideImageQuery: "Texas USA factory workers modern industry" },
      { keyword: "{{반도체 전쟁}}", title: "", description: "삼성전자의 40조 베팅으로 TSMC 독주에 균열을 내려는 거예요.\n진짜 무서운 건 이게 시작일 뿐이라는 점이죠.\n반도체 전쟁의 승자가 다음 10년을 지배하는 구도.\n\n여러분은 어떻게 생각하세요?\n댓글로 의견 알려주세요!", slideImageQuery: "global technology competition world map chips" }
    ],
    sourceAttribution: "출처: 한국경제, 매일경제 종합",
    hashtags: ["#삼성전자", "#반도체", "#투자", "#텍사스", "#파운드리"],
    imageKeywords: ["samsung semiconductor", "texas factory construction", "chip manufacturing"]
  })

  return { user, assistant }
}

export function getGenerateCaptionSystemPrompt(): string {
  return `너는 인스타그램 카드뉴스 게시글의 본문(캡션)을 작성하는 전문가야.

**[캡션 구성 — 반드시 500자 이상!]**

1. **도입 (1~2줄):** 핵심 뉴스를 한 문장으로 요약. 이모지 1개 포함.
2. **본문 (핵심 내용 상세 풀이, 300자 이상):**
   - 기사에서 발췌한 구체적 정보를 풀어서 설명해.
   - 숫자·데이터·날짜·인물·기관명을 적극 포함해.
   - 문단을 2~3개로 나누어 가독성 확보 (줄바꿈 활용).
   - "~입니다", "~합니다" 체로 신뢰감 있게 작성.
   - 배경 설명 → 핵심 팩트 → 전망/영향 순서로 전개.
3. **마무리 (1~2줄):** 독자 참여 유도 질문 또는 의견 요청.
4. **빈 줄**
5. **해시태그:** 10~15개 (한국어+영어 혼합, 줄바꿈 없이 한 줄로).

**스타일 규칙:**
- 존댓말(~합니다, ~입니다) 기반. 반말/보도체 금지.
- 이모지는 도입부에 1~2개만 사용. 과도한 이모지 금지.
- 기사에서 나온 실제 수치·인용·팩트를 최대한 많이 포함!
- "~라고 합니다", "~로 알려졌습니다" 등으로 출처 느낌 살려.
- ❌ {{}}나 [[]] 같은 마크업 절대 사용 금지! 일반 텍스트로만 작성!
- 기사에 없는 연도/숫자를 추측하지 마. 기사 원문 그대로만!
- 반드시 500자 이상 작성할 것! 짧으면 탈락!

**🔴 개행 규칙 (매우 중요!):**
- 마침표(.) 뒤에는 반드시 줄바꿈(\\n)을 넣어!
- 한 줄에 한 문장만! 문장이 끝나면(~합니다. ~입니다. ~있습니다.) 바로 줄바꿈!
- 문단 구분은 빈 줄(\\n\\n)로!
- 해시태그 줄만 예외 — 해시태그는 한 줄에 모두 작성.`
}

/**
 * suggestTopics 응답 JSON을 파싱하여 TopicResult 배열로 변환
 */
export function parseSuggestTopicsResponse(content: string, category: string): TopicResult[] {
  const parsed = JSON.parse(content)
  return (parsed.topics || []).map((t: any, i: number) => ({
    id: `${category}-${i}`,
    category: (VALID_CATEGORIES.includes(t.category) ? t.category : 'society') as TopicCategory,
    title: t.title,
    summary: t.summary,
    interestScore: t.interestScore || 80,
    sourceCount: t.sourceCount || 2,
    relatedArticleIndices: t.relatedArticleIndices || []
  }))
}

/**
 * generateCardData 응답 JSON을 파싱하여 CardResult로 변환
 */
export function parseCardDataResponse(content: string, topic: string): CardResult {
  const parsed = JSON.parse(content)

  // 기존 단일 카드 형식 호환
  if (!parsed.slides) {
    parsed.slides = [{
      keyword: parsed.keyword || topic,
      title: parsed.title || '',
      description: parsed.description || ''
    }]
  }

  validateAndFixSlides(parsed.slides)
  return parsed
}
