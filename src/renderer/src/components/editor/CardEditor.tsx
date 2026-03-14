import { useCardStore } from '@/stores/useCardStore'
import Input from '@/components/common/Input'
import LayoutSelector from './LayoutSelector'
import type { TextBlock, TitleSegment } from '@/types'

const COLOR_PALETTE = ['#FF0000', '#FFD700', '#00FF00', '#00BFFF', '#FF69B4', '#FFFFFF']

interface Props {
  slideIndex: number
}

export default function CardEditor({ slideIndex }: Props) {
  const { cardData, setCardData } = useCardStore()
  const isCover = slideIndex === 0

  // 폰트 크기를 모든 슬라이드에 일괄 적용
  const setGlobalFontSize = (updates: Partial<CardData>) => {
    const store = useCardStore.getState()
    const newSlides = store.slides.map((s) => ({ ...s, ...updates }))
    useCardStore.setState({
      slides: newSlides,
      cardData: { ...store.cardData, ...updates }
    })
  }

  // --- 커버 타이틀 색상 편집기 ---
  const handleSegmentColor = (segIndex: number, color: string | undefined) => {
    const segments = [...(cardData.coverTitleSegments || [])]
    segments[segIndex] = { ...segments[segIndex], color }
    setCardData({ coverTitleSegments: segments })
  }

  const initSegments = () => {
    const words = cardData.keyword.split(/\s+/).filter(Boolean)
    const segments: TitleSegment[] = words.map((w) => ({ text: w }))
    setCardData({ coverTitleSegments: segments })
  }

  // --- 텍스트 블록 편집기 ---
  const addTextBlock = () => {
    const blocks = [...(cardData.textBlocks || [])]
    const newBlock: TextBlock = {
      id: `tb-${Date.now()}`,
      content: '텍스트',
      x: 50,
      y: 20,
      fontSize: 32,
      color: '#FFFFFF',
      fontWeight: 700,
      maxWidth: 80
    }
    blocks.push(newBlock)
    setCardData({ textBlocks: blocks })
  }

  const updateTextBlock = (id: string, updates: Partial<TextBlock>) => {
    const blocks = (cardData.textBlocks || []).map((b) =>
      b.id === id ? { ...b, ...updates } : b
    )
    setCardData({ textBlocks: blocks })
  }

  const removeTextBlock = (id: string) => {
    const blocks = (cardData.textBlocks || []).filter((b) => b.id !== id)
    setCardData({ textBlocks: blocks })
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      <LayoutSelector />

      <Input
        label="키워드 (카드 메인 텍스트)"
        value={cardData.keyword}
        onChange={(v) => setCardData({ keyword: v })}
        placeholder="핵심 키워드 (Shift+Enter로 개행)"
        multiline
      />

      {/* 커버 타이틀 색상 편집기 (표지만) */}
      {isCover && (
        <div className="rounded-lg border border-cream-dark bg-cream/30 p-3 dark:border-gray-600 dark:bg-gray-700/30">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-text-gray dark:text-gray-400">
              단어별 색상 강조
            </span>
            {(!cardData.coverTitleSegments || cardData.coverTitleSegments.length === 0) && (
              <button
                onClick={initSegments}
                className="rounded px-2 py-1 text-xs font-medium text-blue-accent hover:bg-blue-accent/10 cursor-pointer"
              >
                색상 편집 시작
              </button>
            )}
          </div>

          {cardData.coverTitleSegments && cardData.coverTitleSegments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {cardData.coverTitleSegments.map((seg, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span
                    className="rounded px-2 py-1 text-sm font-bold"
                    style={{
                      color: seg.color || '#FFFFFF',
                      backgroundColor: seg.color ? `${seg.color}20` : '#33333330',
                      border: `1px solid ${seg.color || '#888'}`
                    }}
                  >
                    {seg.text}
                  </span>
                  <div className="flex gap-0.5">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c}
                        onClick={() => handleSegmentColor(i, c)}
                        className="h-4 w-4 rounded-full border border-gray-300 cursor-pointer transition-transform hover:scale-125"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                    <button
                      onClick={() => handleSegmentColor(i, undefined)}
                      className="h-4 w-4 rounded-full border border-gray-300 bg-gray-800 cursor-pointer text-[8px] text-white leading-none flex items-center justify-center"
                      title="기본색 (흰색)"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 폰트 사이즈 조절 (전체 카드 공통) */}
      <div className="rounded-lg border border-cream-dark bg-cream/30 p-3 dark:border-gray-600 dark:bg-gray-700/30">
        <span className="mb-2 block text-sm font-medium text-text-gray dark:text-gray-400">
          폰트 크기 조절 <span className="text-xs text-text-light dark:text-gray-500">(전체 카드 공통)</span>
        </span>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 text-text-light dark:text-gray-500">키워드</span>
            <input
              type="range"
              min={24}
              max={96}
              value={cardData.keywordFontSize || (isCover ? 72 : 48)}
              onChange={(e) => setGlobalFontSize({ keywordFontSize: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="w-10 text-right text-text-gray dark:text-gray-400">
              {cardData.keywordFontSize || (isCover ? 72 : 48)}px
            </span>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 text-text-light dark:text-gray-500">본문</span>
            <input
              type="range"
              min={14}
              max={40}
              value={cardData.descriptionFontSize || 26}
              onChange={(e) => setGlobalFontSize({ descriptionFontSize: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="w-10 text-right text-text-gray dark:text-gray-400">
              {cardData.descriptionFontSize || 26}px
            </span>
          </label>
        </div>
      </div>

      <Input
        label="설명"
        value={cardData.description}
        onChange={(v) => setCardData({ description: v })}
        placeholder="설명 문장 (본문 카드: 200자 이상 권장)"
        multiline
      />

      <Input
        label="출처"
        value={cardData.source}
        onChange={(v) => setCardData({ source: v })}
        placeholder="출처: 매체1, 매체2 종합"
      />

      <Input
        label="해시태그 (쉼표로 구분)"
        value={cardData.hashtags?.join(', ') || ''}
        onChange={(v) =>
          setCardData({
            hashtags: v
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          })
        }
        placeholder="#AI, #뉴스, #카드뉴스"
      />

      <Input
        label="배경 이미지 URL"
        value={cardData.backgroundImageUrl || ''}
        onChange={(v) => setCardData({ backgroundImageUrl: v })}
        placeholder="https://images.unsplash.com/..."
      />

      {/* 텍스트 블록 편집기 */}
      <div className="border-t border-cream-dark pt-4 dark:border-gray-600">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-text-gray dark:text-gray-400">
            커스텀 텍스트 블록
          </span>
          <button
            onClick={addTextBlock}
            className="rounded px-2 py-1 text-xs font-medium text-blue-accent hover:bg-blue-accent/10 cursor-pointer"
          >
            + 텍스트 추가
          </button>
        </div>

        {(cardData.textBlocks || []).map((block) => (
          <div
            key={block.id}
            className="mb-3 rounded-lg border border-cream-dark bg-cream/20 p-3 dark:border-gray-600 dark:bg-gray-700/20"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-text-light dark:text-gray-500">텍스트 블록</span>
              <button
                onClick={() => removeTextBlock(block.id)}
                className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
              >
                삭제
              </button>
            </div>

            <textarea
              value={block.content}
              onChange={(e) => updateTextBlock(block.id, { content: e.target.value })}
              className="mb-2 w-full rounded border border-cream-dark bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              rows={2}
              placeholder="텍스트 내용"
            />

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex flex-col gap-1">
                <span className="text-text-light dark:text-gray-500">X 위치 ({block.x}%)</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={block.x}
                  onChange={(e) => updateTextBlock(block.id, { x: Number(e.target.value) })}
                  className="w-full"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-text-light dark:text-gray-500">Y 위치 ({block.y}%)</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={block.y}
                  onChange={(e) => updateTextBlock(block.id, { y: Number(e.target.value) })}
                  className="w-full"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-text-light dark:text-gray-500">크기 ({block.fontSize}px)</span>
                <input
                  type="range"
                  min={12}
                  max={80}
                  value={block.fontSize}
                  onChange={(e) => updateTextBlock(block.id, { fontSize: Number(e.target.value) })}
                  className="w-full"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-text-light dark:text-gray-500">색상</span>
                <div className="flex gap-1">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateTextBlock(block.id, { color: c })}
                      className={`h-5 w-5 rounded-full border cursor-pointer transition-transform hover:scale-125 ${
                        block.color === c ? 'border-blue-accent ring-1 ring-blue-accent' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-cream-dark pt-4 dark:border-gray-600">
        <Input
          label="인스타그램 본문글"
          value={cardData.caption || ''}
          onChange={(v) => setCardData({ caption: v })}
          placeholder="인스타그램에 올릴 본문 텍스트가 자동으로 생성됩니다..."
          multiline
        />
      </div>
    </div>
  )
}
