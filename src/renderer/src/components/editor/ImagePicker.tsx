import { useState, useEffect } from 'react'
import { useCardStore } from '@/stores/useCardStore'
import { useToastStore } from '@/stores/useToastStore'
import { DUMMY_IMAGES } from '@/lib/dummyData'

interface ImageResult {
  id: string
  url: string
  thumbUrl: string
  description: string
  photographer: string
}

export default function ImagePicker() {
  const { cardData, setCardData, selectedTopic } = useCardStore()
  const addToast = useToastStore((s) => s.addToast)
  const [images, setImages] = useState<ImageResult[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedTopic) {
      const keyword = selectedTopic.title.split(',')[0].slice(0, 20)
      setQuery(keyword)
      handleSearch(keyword)
    }
  }, [selectedTopic?.id])

  const toDummyImages = () =>
    DUMMY_IMAGES.map((url, i) => ({
      id: String(i),
      url,
      thumbUrl: url,
      description: '',
      photographer: ''
    }))

  const handleSearch = async (q?: string) => {
    const searchQuery = q || query
    if (!searchQuery.trim()) return

    if (!window.api) {
      setImages(toDummyImages())
      return
    }

    setLoading(true)
    try {
      const result = await window.api.searchImages(searchQuery)
      if (result.success && result.images?.length > 0) {
        setImages(result.images)
      } else {
        addToast('error', '이미지 검색 실패. 더미 이미지를 표시합니다.')
        setImages(toDummyImages())
      }
    } catch {
      addToast('error', 'Unsplash API 키를 확인해주세요.')
      setImages(toDummyImages())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-text-gray dark:text-gray-300">배경 이미지 선택</span>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="이미지 검색어 입력..."
          className="flex-1 rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm focus:border-blue-accent focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <button
          onClick={() => handleSearch()}
          disabled={loading}
          className="rounded-lg bg-blue-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {loading ? '...' : '검색'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {images.map((img) => (
          <button
            key={img.id}
            onClick={() => setCardData({ backgroundImageUrl: img.url })}
            className={`aspect-square overflow-hidden rounded-lg border-2 transition-all cursor-pointer ${
              cardData.backgroundImageUrl === img.url
                ? 'border-blue-accent ring-2 ring-blue-accent/30'
                : 'border-cream-dark hover:border-blue-accent/40 dark:border-gray-600'
            }`}
            title={img.photographer ? `Photo by ${img.photographer}` : ''}
          >
            <img
              src={img.thumbUrl || img.url}
              alt={img.description}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          </button>
        ))}
      </div>

      {images.length === 0 && !loading && (
        <p className="text-center text-xs text-text-light py-4">
          검색어를 입력하거나 주제를 선택하면 이미지가 표시됩니다
        </p>
      )}
    </div>
  )
}
