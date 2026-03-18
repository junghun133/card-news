import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CardCanvas, { type CardCanvasHandle } from '@/components/cards/CardCanvas'
import CardEditor from '@/components/editor/CardEditor'
import ImagePicker from '@/components/editor/ImagePicker'
import VideoPicker from '@/components/editor/VideoPicker'
import Button from '@/components/common/Button'
import { useCardStore } from '@/stores/useCardStore'
import { useToastStore } from '@/stores/useToastStore'
import { useVideoCreatorStore } from '@/stores/useVideoCreatorStore'
import { saveProject } from '@/lib/projectService'
import { isSupabaseConfigured } from '@/lib/supabase'
import { isGifUrl } from '@/lib/gifExport'

export default function EditorPage() {
  const navigate = useNavigate()
  const canvasRef = useRef<CardCanvasHandle>(null)
  const { cardData, selectedLayout, slides, currentSlideIndex, setCurrentSlide, setCardData, addSlide, removeSlide } =
    useCardStore()
  const addToast = useToastStore((s) => s.addToast)
  const [exporting, setExporting] = useState(false)
  const [captionCopied, setCaptionCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [projectId, setProjectId] = useState<string | undefined>()
  const openVideoCreator = useVideoCreatorStore((s) => s.open)

  /**
   * 단일 슬라이드의 이미지를 프록시하고, 내보내기 후 원래 URL로 복원
   */
  const handleExport = async (format: 'png' | 'jpeg' = 'png') => {
    if (!canvasRef.current) return
    setExporting(true)
    try {
      const originalBg = cardData.backgroundImageUrl

      if (originalBg && !originalBg.startsWith('data:') && !originalBg.startsWith('blob:') && window.api?.proxyImage) {
        try {
          const result = await window.api.proxyImage(originalBg)
          if (result.success && result.dataUrl) {
            setCardData({ backgroundImageUrl: result.dataUrl })
            await new Promise((r) => setTimeout(r, 300))
          }
        } catch { /* fallback to direct URL */ }
      }

      const latestBgUrl = useCardStore.getState().cardData.backgroundImageUrl
      const useGif = isGifUrl(originalBg) || isGifUrl(latestBgUrl)
      let dataUrl: string
      let actualFormat = format

      if (useGif && latestBgUrl) {
        addToast('info', 'GIF 생성 중... (시간이 걸릴 수 있습니다)')
        dataUrl = await canvasRef.current.exportGif(latestBgUrl)
        actualFormat = 'gif' as any
      } else {
        dataUrl = format === 'jpeg'
          ? await canvasRef.current.exportJpeg()
          : await canvasRef.current.exportPng()
      }

      if (originalBg && cardData.backgroundImageUrl !== originalBg) {
        setCardData({ backgroundImageUrl: originalBg })
      }

      if (window.api) {
        const result = await window.api.saveImage(dataUrl)
        if (result.success) {
          addToast('success', `${String(actualFormat).toUpperCase()} 파일이 저장되었습니다.`)
        } else if (result.reason !== 'canceled') {
          addToast('error', '저장에 실패했습니다.')
        }
      } else {
        const ext = useGif ? 'gif' : format
        const link = document.createElement('a')
        link.download = `card-news-${Date.now()}.${ext}`
        link.href = dataUrl
        link.click()
        addToast('success', `${String(actualFormat).toUpperCase()} 파일이 다운로드되었습니다.`)
      }
    } catch (err) {
      console.error('Export failed:', err)
      addToast('error', '내보내기에 실패했습니다.')
    } finally {
      setExporting(false)
    }
  }

  /**
   * 전체 슬라이드 내보내기
   */
  const handleExportAll = async () => {
    if (!canvasRef.current) return
    setExporting(true)

    const originalUrls = slides.map((s) => s.backgroundImageUrl)

    try {
      addToast('info', '이미지 준비 중...')
      if (window.api?.proxyImage) {
        const store = useCardStore.getState()
        for (let i = 0; i < store.slides.length; i++) {
          const bg = store.slides[i].backgroundImageUrl
          if (bg && !bg.startsWith('data:') && !bg.startsWith('blob:')) {
            try {
              const result = await window.api.proxyImage(bg)
              if (result.success && result.dataUrl) {
                const newSlides = [...useCardStore.getState().slides]
                newSlides[i] = { ...newSlides[i], backgroundImageUrl: result.dataUrl }
                useCardStore.setState({
                  slides: newSlides,
                  cardData: newSlides[useCardStore.getState().currentSlideIndex]
                })
              }
            } catch (err) {
              console.warn(`[Export] Proxy slide ${i + 1} image failed:`, err)
            }
          }
        }
        await new Promise((r) => setTimeout(r, 300))
      }

      const savedIndex = currentSlideIndex
      const dataUrls: string[] = []

      for (let i = 0; i < slides.length; i++) {
        setCurrentSlide(i)
        await new Promise((r) => setTimeout(r, 500))
        try {
          const slideBg = useCardStore.getState().cardData.backgroundImageUrl
          let dataUrl: string
          if (isGifUrl(slideBg) && slideBg) {
            addToast('info', `${i + 1}번 카드 GIF 생성 중...`)
            dataUrl = await canvasRef.current!.exportGif(slideBg)
          } else {
            dataUrl = await canvasRef.current!.exportPng()
          }
          dataUrls.push(dataUrl)
        } catch (slideErr) {
          console.error(`Export slide ${i + 1} failed:`, slideErr)
          addToast('error', `${i + 1}번 카드 내보내기 실패. 이미지를 확인해주세요.`)
          throw slideErr
        }
      }

      setCurrentSlide(savedIndex)

      const restoredSlides = useCardStore.getState().slides.map((s, i) => ({
        ...s,
        backgroundImageUrl: originalUrls[i]
      }))
      useCardStore.setState({
        slides: restoredSlides,
        cardData: restoredSlides[savedIndex]
      })

      if (window.api?.saveAllImages) {
        const result = await window.api.saveAllImages(dataUrls)
        if (result.success) {
          addToast('success', `${result.count}장의 카드가 저장되었습니다. 뉴스 목록으로 이동합니다.`)
          setTimeout(() => navigate('/'), 1500)
        } else if (result.reason !== 'canceled') {
          addToast('error', '저장에 실패했습니다.')
        }
      } else {
        dataUrls.forEach((url, i) => {
          const link = document.createElement('a')
          link.download = `card-news-${i + 1}.png`
          link.href = url
          link.click()
        })
        addToast('success', `${dataUrls.length}장의 카드가 다운로드되었습니다. 뉴스 목록으로 이동합니다.`)
        setTimeout(() => navigate('/'), 1500)
      }
    } catch (err) {
      console.error('Export all failed:', err)
      addToast('error', '전체 내보내기에 실패했습니다.')

      const restoredSlides = useCardStore.getState().slides.map((s, i) => ({
        ...s,
        backgroundImageUrl: originalUrls[i]
      }))
      useCardStore.setState({
        slides: restoredSlides,
        cardData: restoredSlides[useCardStore.getState().currentSlideIndex]
      })
    } finally {
      setExporting(false)
    }
  }

  const handleCopyCaption = async () => {
    const firstSlide = slides[0]
    const caption =
      firstSlide?.caption ||
      cardData.caption ||
      `${cardData.title}\n\n${cardData.description}\n\n${cardData.hashtags?.join(' ') || ''}`
    navigator.clipboard.writeText(caption)
    setCaptionCopied(true)
    addToast('success', '캡션이 클립보드에 복사되었습니다.')
    setTimeout(() => setCaptionCopied(false), 2000)
  }

  const handleRegenerateCaption = async () => {
    if (!window.api) return
    try {
      const result = await window.api.generateCaption(cardData)
      if (result.success) {
        useCardStore.getState().setCardData({ caption: result.caption })
        addToast('success', '캡션이 재생성되었습니다.')
      } else {
        addToast('error', '캡션 생성에 실패했습니다. API 키를 확인해주세요.')
      }
    } catch {
      addToast('error', 'OpenAI API 키를 확인해주세요.')
    }
  }

  const handleSaveToCloud = async () => {
    setSaving(true)
    try {
      const title = slides[0]?.keyword || slides[0]?.title || '제목 없음'
      const category = useCardStore.getState().selectedTopic?.category || ''
      const result = await saveProject({
        id: projectId,
        title,
        category,
        slides,
        selectedLayout
      })
      if (result.success) {
        setProjectId(result.id)
        addToast('success', '클라우드에 저장되었습니다.')
      } else {
        addToast('error', result.error || '저장에 실패했습니다.')
      }
    } catch {
      addToast('error', '클라우드 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // ─────────────────────── 렌더링 ───────────────────────

  return (
    <div className="flex h-full gap-6">
      {/* 좌측: 카드 미리보기 + 슬라이드 네비게이션 */}
      <div className="flex flex-col items-center gap-3 overflow-y-auto shrink-0" style={{ maxHeight: '100%' }}>
        <CardCanvas ref={canvasRef} scale={0.42} slideIndex={currentSlideIndex} />

        {/* 슬라이드 네비게이션 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentSlide(currentSlideIndex - 1)}
            disabled={currentSlideIndex === 0}
            className="rounded-lg px-2 py-1 text-lg text-text-gray hover:bg-cream-dark disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700 cursor-pointer disabled:cursor-not-allowed"
          >
            ◀
          </button>

          <div className="flex gap-1">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  i === currentSlideIndex
                    ? 'bg-blue-accent text-white'
                    : 'bg-cream-dark text-text-gray hover:bg-blue-accent/20 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentSlide(currentSlideIndex + 1)}
            disabled={currentSlideIndex === slides.length - 1}
            className="rounded-lg px-2 py-1 text-lg text-text-gray hover:bg-cream-dark disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700 cursor-pointer disabled:cursor-not-allowed"
          >
            ▶
          </button>

          <button
            onClick={addSlide}
            className="ml-2 rounded-lg px-2 py-1 text-lg text-blue-accent hover:bg-blue-accent/10 cursor-pointer"
            title="슬라이드 추가"
          >
            +
          </button>

          {slides.length > 1 && (
            <button
              onClick={() => removeSlide(currentSlideIndex)}
              className="rounded-lg px-2 py-1 text-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
              title="현재 슬라이드 삭제"
            >
              ✕
            </button>
          )}
        </div>

        <div className="text-xs text-text-light dark:text-gray-500">
          {currentSlideIndex + 1} / {slides.length}장
        </div>

        {/* 속보 아이콘 토글 */}
        {currentSlideIndex === 0 && (
          <button
            onClick={() => setCardData({ showNewsIcon: !cardData.showNewsIcon })}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-all cursor-pointer ${
              cardData.showNewsIcon
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-cream-dark text-text-gray hover:bg-cream-dark/80 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {cardData.showNewsIcon ? '🔴 속보 아이콘 ON' : '⚪ 속보 아이콘 OFF'}
          </button>
        )}

        {/* 내보내기 버튼 */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExportAll} disabled={exporting}>
            {exporting ? '내보내는 중...' : `전체 내보내기 (${slides.length}장)`}
          </Button>
          <Button variant="secondary" onClick={() => handleExport('png')} disabled={exporting}>
            현재 카드 PNG
          </Button>
        </div>
        <Button
          variant="secondary"
          onClick={openVideoCreator}
          disabled={exporting}
          className="w-full"
        >
          🎬 카드 영상 만들기
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleCopyCaption}>
            {captionCopied ? '복사 완료!' : '캡션 복사'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRegenerateCaption}>
            캡션 재생성
          </Button>
        </div>
        {isSupabaseConfigured && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSaveToCloud}
            disabled={saving}
            className="mt-2 w-full"
          >
            {saving ? '저장 중...' : projectId ? '☁️ 클라우드 업데이트' : '☁️ 클라우드 저장'}
          </Button>
        )}
      </div>

      {/* 우측: 편집 패널 */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-cream-dark bg-white p-5 dark:border-gray-600 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-bold text-text-dark dark:text-white">
          카드 편집 — {currentSlideIndex + 1}장
          {currentSlideIndex === 0 && (
            <span className="ml-2 text-sm font-normal text-blue-accent">표지</span>
          )}
          {currentSlideIndex === slides.length - 1 && currentSlideIndex > 0 && (
            <span className="ml-2 text-sm font-normal text-blue-accent">마무리</span>
          )}
        </h3>
        <CardEditor slideIndex={currentSlideIndex} />
        <div className="mt-4">
          <ImagePicker />
        </div>
        <div className="mt-4">
          <VideoPicker />
        </div>
      </div>

    </div>
  )
}
