import { useState } from 'react'
import { useCardStore } from '@/stores/useCardStore'
import { DUMMY_IMAGES } from '@/lib/dummyData'

export default function ImagePicker() {
  const { cardData, setCardData } = useCardStore()
  const [images] = useState(DUMMY_IMAGES)

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-text-gray">배경 이미지 선택</span>
      <div className="grid grid-cols-3 gap-2">
        {images.map((url, i) => (
          <button
            key={i}
            onClick={() =>
              setCardData({
                backgroundImageUrl: url.replace('w=400&h=400', 'w=1080&h=1080')
              })
            }
            className={`aspect-square overflow-hidden rounded-lg border-2 transition-all cursor-pointer ${
              cardData.backgroundImageUrl?.includes(url.split('?')[0])
                ? 'border-blue-accent ring-2 ring-blue-accent/30'
                : 'border-cream-dark hover:border-blue-accent/40'
            }`}
          >
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
