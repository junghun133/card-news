import { useState, useEffect, useRef } from 'react'
import { useCardStore } from '@/stores/useCardStore'
import { useToastStore } from '@/stores/useToastStore'
import { DUMMY_IMAGES } from '@/lib/dummyData'

type ImageSource = 'unsplash' | 'google'

interface ImageResult {
  id: string
  url: string
  thumbUrl: string
  description: string
  photographer: string
}

export default function ImagePicker() {
  const { cardData, setCardData, selectedTopic, currentSlideIndex } = useCardStore()
  const addToast = useToastStore((s) => s.addToast)
  const [images, setImages] = useState<ImageResult[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [source, setSource] = useState<ImageSource>('unsplash')
  const [googlePage, setGooglePage] = useState(1)
  const lastSearchQuery = useRef('')

  useEffect(() => {
    if (selectedTopic) {
      const slideKeyword = cardData.keyword?.replace(/\{\{|\}\}|\[\[|\]\]|"/g, '').trim()
      const keyword = (slideKeyword || selectedTopic.title.split(',')[0]).slice(0, 20)
      setQuery(keyword)
      handleSearch(keyword, source)
    }
  }, [selectedTopic?.id, currentSlideIndex])

  const toDummyImages = () =>
    DUMMY_IMAGES.map((url, i) => ({
      id: String(i),
      url,
      thumbUrl: url,
      description: '',
      photographer: ''
    }))

  const mapGoogleImages = (imgs: any[], startIdx = 0): ImageResult[] =>
    imgs.map((img: any, i: number) => ({
      id: `google-${startIdx + i}`,
      url: img.imageUrl,
      thumbUrl: img.thumbnailUrl || img.imageUrl,
      description: img.title || '',
      photographer: img.source || ''
    }))

  const handleSearch = async (q?: string, src?: ImageSource) => {
    const searchQuery = q || query
    if (!searchQuery.trim()) return
    if (!window.api) {
      setImages(toDummyImages())
      return
    }

    const activeSource = src || source
    setLoading(true)
    setGooglePage(1)
    lastSearchQuery.current = searchQuery

    try {
      if (activeSource === 'google') {
        const result = await window.api.searchGoogleImages(searchQuery, 1)
        if (result.success && result.images?.length > 0) {
          setImages(mapGoogleImages(result.images))
        } else {
          setImages([])
          if (result.error) addToast('error', `Google 이미지 검색 실패: ${result.error}`)
        }
      } else {
        const result = await window.api.searchImages(searchQuery)
        if (result.success && result.images?.length > 0) {
          setImages(result.images)
        } else {
          console.warn('[ImagePicker] Search failed:', result.error || 'no images')
          addToast('error', result.error ? `이미지 검색 실패: ${result.error}` : '이미지를 찾지 못했습니다.')
          setImages(toDummyImages())
        }
      }
    } catch (err: any) {
      console.error('[ImagePicker] Exception:', err)
      addToast('error', `이미지 검색 오류: ${err.message}`)
      setImages(toDummyImages())
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = async () => {
    if (!window.api?.searchGoogleImages || source !== 'google') return
    const nextPage = googlePage + 1
    setLoadingMore(true)

    try {
      const result = await window.api.searchGoogleImages(lastSearchQuery.current || query, nextPage)
      if (result.success && result.images?.length > 0) {
        setImages((prev) => [...prev, ...mapGoogleImages(result.images, prev.length)])
        setGooglePage(nextPage)
      } else {
        addToast('info', '더 이상 이미지가 없습니다.')
      }
    } catch (err: any) {
      console.error('[ImagePicker] Load more failed:', err)
      addToast('error', `추가 이미지 로딩 실패: ${err.message}`)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleSourceChange = (newSource: ImageSource) => {
    setSource(newSource)
    setGooglePage(1)
    if (query.trim()) {
      handleSearch(query, newSource)
    }
  }

  const handleSelectImage = async (img: ImageResult) => {
    if (source === 'google' && window.api?.proxyImage && !img.url.startsWith('data:')) {
      try {
        addToast('info', '이미지 로딩 중...')
        const result = await window.api.proxyImage(img.url)
        if (result.success && result.dataUrl) {
          setCardData({ backgroundImageUrl: result.dataUrl })
          return
        }
      } catch (err) {
        console.warn('[ImagePicker] Proxy failed, using direct URL:', err)
      }
    }
    setCardData({ backgroundImageUrl: img.url })
  }

  const handleUploadLocal = async () => {
    if (!window.api?.uploadLocalImage) return
    try {
      const result = await window.api.uploadLocalImage()
      if (result.success && result.dataUrl) {
        setCardData({ backgroundImageUrl: result.dataUrl })
        addToast('success', '이미지가 적용되었습니다.')
      }
    } catch (err: any) {
      console.error('[ImagePicker] Upload error:', err)
      addToast('error', `이미지 업로드 오류: ${err.message}`)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-gray dark:text-gray-300">배경 이미지 선택</span>
        <button
          onClick={handleUploadLocal}
          className="rounded-lg border border-cream-dark px-2 py-1 text-xs text-text-gray hover:border-blue-accent hover:text-blue-accent dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-accent dark:hover:text-blue-accent cursor-pointer transition-colors"
          title="내 컴퓨터에서 이미지 선택"
        >
          파일 업로드
        </button>
      </div>

      {/* 소스 탭 */}
      <div className="flex rounded-lg border border-cream-dark dark:border-gray-600 overflow-hidden">
        <button
          onClick={() => handleSourceChange('unsplash')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
            source === 'unsplash'
              ? 'bg-blue-accent text-white'
              : 'bg-white text-text-gray hover:bg-cream-light dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Unsplash
        </button>
        <button
          onClick={() => handleSourceChange('google')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
            source === 'google'
              ? 'bg-blue-accent text-white'
              : 'bg-white text-text-gray hover:bg-cream-light dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Google
        </button>
      </div>

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
            onClick={() => handleSelectImage(img)}
            className={`aspect-square overflow-hidden rounded-lg border-2 transition-all cursor-pointer ${
              cardData.backgroundImageUrl === img.url
                ? 'border-blue-accent ring-2 ring-blue-accent/30'
                : 'border-cream-dark hover:border-blue-accent/40 dark:border-gray-600'
            }`}
            title={img.photographer ? `${source === 'google' ? img.photographer : `Photo by ${img.photographer}`}` : ''}
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

      {/* Google 이미지 더 보기 */}
      {source === 'google' && images.length > 0 && !loading && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full rounded-lg border border-cream-dark py-2 text-xs font-medium text-text-gray hover:border-blue-accent hover:text-blue-accent dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-accent dark:hover:text-blue-accent cursor-pointer transition-colors disabled:opacity-50"
        >
          {loadingMore ? '로딩 중...' : `더 보기 (${images.length}장 로드됨)`}
        </button>
      )}

      {images.length === 0 && !loading && (
        <p className="text-center text-xs text-text-light py-4">
          검색어를 입력하거나 주제를 선택하면 이미지가 표시됩니다
        </p>
      )}
    </div>
  )
}
