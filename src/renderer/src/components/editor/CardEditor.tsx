import { useCardStore } from '@/stores/useCardStore'
import Input from '@/components/common/Input'
import LayoutSelector from './LayoutSelector'

export default function CardEditor() {
  const { cardData, setCardData } = useCardStore()

  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      <LayoutSelector />

      <Input
        label="키워드 (카드 메인 텍스트)"
        value={cardData.keyword}
        onChange={(v) => setCardData({ keyword: v })}
        placeholder="핵심 키워드"
      />

      <Input
        label="제목"
        value={cardData.title}
        onChange={(v) => setCardData({ title: v })}
        placeholder="카드 제목"
      />

      <Input
        label="설명"
        value={cardData.description}
        onChange={(v) => setCardData({ description: v })}
        placeholder="설명 문장"
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

      <div className="border-t border-cream-dark pt-4">
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
