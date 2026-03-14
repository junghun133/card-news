import { useState, useEffect } from 'react'
import { useCardStore } from '@/stores/useCardStore'
import { useToastStore } from '@/stores/useToastStore'

interface VideoResult {
  title: string
  link: string
  thumbnailUrl: string
  duration: string
  source: string
  date: string
}

export default function VideoPicker() {
  const { selectedTopic } = useCardStore()
  const addToast = useToastStore((s) => s.addToast)
  const [videos, setVideos] = useState<VideoResult[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (selectedTopic) {
      const keyword = selectedTopic.title.split(',')[0].slice(0, 30)
      setQuery(keyword)
      handleSearch(keyword)
    }
  }, [selectedTopic?.id])

  const handleSearch = async (q?: string) => {
    const searchQuery = q || query
    if (!searchQuery.trim()) return
    if (!window.api?.searchVideos) return

    setLoading(true)
    try {
      const result = await window.api.searchVideos(searchQuery)
      if (result.success && result.videos?.length > 0) {
        setVideos(result.videos)
      } else {
        setVideos([])
      }
    } catch (err: any) {
      console.error('[VideoPicker] Exception:', err)
      addToast('error', `영상 검색 오류: ${err.message}`)
      setVideos([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenVideo = (url: string) => {
    window.open(url, '_blank')
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between text-sm font-medium text-text-gray dark:text-gray-300 cursor-pointer hover:text-text-dark dark:hover:text-white"
      >
        <span>참고 영상 (1분 이하)</span>
        <span className="text-xs">{collapsed ? '▼' : '▲'}</span>
      </button>

      {!collapsed && (
        <>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="영상 검색어 입력..."
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

          {loading && (
            <p className="text-center text-xs text-text-light py-2">영상 검색 중...</p>
          )}

          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
            {videos.map((video, idx) => (
              <button
                key={`${video.link}-${idx}`}
                onClick={() => handleOpenVideo(video.link)}
                className="flex gap-3 rounded-lg border border-cream-dark p-2 text-left transition-all hover:border-blue-accent/40 hover:bg-cream-light/50 dark:border-gray-600 dark:hover:border-blue-accent/40 dark:hover:bg-gray-700/50 cursor-pointer"
                title="클릭하면 브라우저에서 열립니다"
              >
                {/* 썸네일 */}
                <div className="relative flex-shrink-0 w-24 h-16 rounded-md overflow-hidden bg-gray-200 dark:bg-gray-600">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-lg">
                      🎬
                    </div>
                  )}
                  {/* 재생시간 뱃지 */}
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-black/75 px-1 py-0.5 text-[10px] font-mono text-white">
                    {video.duration}
                  </span>
                </div>

                {/* 텍스트 정보 */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-dark dark:text-white line-clamp-2 leading-tight">
                    {video.title}
                  </p>
                  <p className="mt-1 text-[10px] text-text-light dark:text-gray-400">
                    {video.source}
                    {video.date && ` · ${video.date}`}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {videos.length === 0 && !loading && (
            <p className="text-center text-xs text-text-light py-3">
              1분 이하 관련 영상이 없습니다
            </p>
          )}
        </>
      )}
    </div>
  )
}
