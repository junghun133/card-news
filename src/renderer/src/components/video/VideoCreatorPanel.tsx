import { useRef, useEffect, createRef } from 'react'
import { toPng } from 'html-to-image'
import CardCanvas, { type CardCanvasHandle } from '@/components/cards/CardCanvas'
import TextPanelCapture from '@/components/cards/TextPanelCapture'
import Button from '@/components/common/Button'
import FloatingWindow from '@/components/common/FloatingWindow'
import { useVideoCreatorStore } from '@/stores/useVideoCreatorStore'
import { useCardStore } from '@/stores/useCardStore'
import { useToastStore } from '@/stores/useToastStore'
import { PROFILE_ICON_SVG } from '@/lib/profileIcon'

export default function VideoCreatorPanel() {
  const store = useVideoCreatorStore()
  const {
    isOpen, isMinimized, windowPosition,
    videoExporting, videoProgress, videoMode, videoSettings, aiGenerating,
    videoStep, videoSlides, videoInfo, videoTrim,
    close, toggleMinimize, setWindowPosition,
    setVideoExporting, setVideoProgress, setVideoMode, setVideoSettings,
    setAiGenerating, setVideoStep, setVideoSlides, setVideoInfo, setVideoTrim,
    resetWizard
  } = store

  const { slides, currentSlideIndex, setCurrentSlide } = useCardStore()
  const addToast = useToastStore((s) => s.addToast)
  const canvasRef = useRef<CardCanvasHandle>(null)
  const textPanelRefs = useRef<React.RefObject<HTMLDivElement | null>[]>([])

  // refs 업데이트
  useEffect(() => {
    textPanelRefs.current = videoSlides.map(
      (_, i) => textPanelRefs.current[i] || createRef<HTMLDivElement>()
    )
  }, [videoSlides])

  // 영상 진행률 리스너
  useEffect(() => {
    if ((!videoExporting && !aiGenerating) || !window.api?.onVideoProgress) return
    const removeListener = window.api.onVideoProgress((step: string, percent: number) => {
      setVideoProgress({ step, percent })
    })
    return () => { removeListener() }
  }, [videoExporting, aiGenerating, setVideoProgress])

  // ─── 워터마크 PNG 생성 ───
  const generateWatermarkDataUrl = async (): Promise<string> => {
    const padL = 10, padR = 16, padT = 8, padB = 8
    const logoSize = 30, gap = 8
    const fontSize = 22
    const text = 'pony__news'

    const measureCanvas = document.createElement('canvas')
    const measureCtx = measureCanvas.getContext('2d')!
    measureCtx.font = `700 ${fontSize}px 'Pretendard', 'Noto Sans KR', sans-serif`
    const textWidth = Math.ceil(measureCtx.measureText(text).width)

    const w = padL + logoSize + gap + textWidth + padR
    const h = padT + logoSize + padB

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, w, h)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.70)'
    const r = 14
    ctx.beginPath()
    ctx.moveTo(r, 0)
    ctx.lineTo(w - r, 0)
    ctx.quadraticCurveTo(w, 0, w, r)
    ctx.lineTo(w, h - r)
    ctx.quadraticCurveTo(w, h, w - r, h)
    ctx.lineTo(r, h)
    ctx.quadraticCurveTo(0, h, 0, h - r)
    ctx.lineTo(0, r)
    ctx.quadraticCurveTo(0, 0, r, 0)
    ctx.closePath()
    ctx.shadowColor = 'rgba(0,0,0,0.15)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 2
    ctx.fill()
    ctx.shadowColor = 'transparent'

    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.onerror = () => resolve()
      img.src = PROFILE_ICON_SVG
    })
    const logoX = padL, logoY = padT
    ctx.save()
    ctx.beginPath()
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(img, logoX, logoY, logoSize, logoSize)
    ctx.restore()

    ctx.fillStyle = '#262626'
    ctx.font = `700 ${fontSize}px 'Pretendard', 'Noto Sans KR', sans-serif`
    ctx.textBaseline = 'middle'
    ctx.fillText(text, padL + logoSize + gap, h / 2)

    return canvas.toDataURL('image/png')
  }

  // ─── BGM 선택 ───
  const handleSelectBgm = async () => {
    if (!window.api?.selectBgm) return
    const result = await window.api.selectBgm()
    if (result.success && result.filePath) {
      setVideoSettings((prev) => ({ ...prev, bgmPath: result.filePath }))
    }
  }

  // ─── 로컬 영상 선택 ───
  const handleSelectLocalVideo = async () => {
    if (!window.api?.selectVideo) return
    const result = await window.api.selectVideo()
    if (result.success && result.filePath) {
      setVideoSettings((prev) => ({ ...prev, localVideoPath: result.filePath, videoUrl: '' }))
    }
  }

  // ─── AI 카드뉴스 문구 생성 ───
  const handleGenerateCardsFromVideo = async () => {
    if (!window.api?.generateCardsFromVideo) {
      addToast('error', 'API가 초기화되지 않았습니다. 앱을 재시작해주세요.')
      return
    }
    const url = videoSettings.videoUrl.trim()
    if (!url) {
      addToast('error', '영상 링크를 먼저 입력해주세요.')
      return
    }

    setAiGenerating(true)
    setVideoProgress({ step: '영상 정보를 분석하고 있어요...', percent: 10 })

    try {
      const cardStore = useCardStore.getState()
      const existingCards = cardStore.slides
        .map((s, i) => `[카드${i + 1}] ${s.keyword || s.title || ''}: ${s.description || ''}`)
        .filter((line) => line.length > 10)
        .join('\n')

      const fullContext = [
        videoSettings.userContext.trim(),
        existingCards ? `\n\n[기존 카드뉴스 내용 — 이 맥락에 맞춰주세요]\n${existingCards}` : ''
      ].filter(Boolean).join('\n')

      const result = await window.api.generateCardsFromVideo({
        videoUrl: url,
        userContext: fullContext || undefined
      })

      if (result.success) {
        const allSlides = result.cardResult.slides
        const coverKeyword = allSlides[0]?.keyword || ''
        const bodyDescriptions = allSlides
          .slice(1)
          .map((s: any) => s.description || '')
          .filter((d: string) => d.trim())
          .slice(0, 2)
          .join('\n')
        const generatedSlides = [{
          keyword: coverKeyword,
          description: bodyDescriptions
        }]
        setVideoSlides(generatedSlides)
        const dur = result.videoInfo.duration
        setVideoInfo({ title: result.videoInfo.title, duration: dur })
        setVideoTrim({ startSec: 0, endSec: Math.min(dur, 60) })
        setVideoStep(2)

        // 카드 스토어에도 반영
        const store = useCardStore.getState()
        const globalKw = store.globalKeywordFontSize
        const globalDesc = store.globalDescriptionFontSize
        const newStoreSlides = result.cardResult.slides.map((slide: any, i: number) => ({
          keyword: slide.keyword || '',
          title: slide.title || '',
          description: slide.description || '',
          source: i === result.cardResult.slides.length - 1 ? (result.cardResult.sourceAttribution || '') : '',
          hashtags: i === result.cardResult.slides.length - 1 ? (result.cardResult.hashtags || []) : [],
          backgroundImageUrl: store.slides[i]?.backgroundImageUrl || '',
          caption: i === 0 ? (result.caption || '') : '',
          imageSearchQuery: slide.slideImageQuery || '',
          keywordFontSize: globalKw,
          descriptionFontSize: globalDesc
        }))
        const lastSlide = store.slides[store.slides.length - 1]
        if (lastSlide?.isProfileCard) {
          newStoreSlides.push(lastSlide)
        }
        useCardStore.setState({
          slides: newStoreSlides,
          cardData: newStoreSlides[0],
          currentSlideIndex: 0
        })

        addToast('success', 'AI가 카드뉴스 문구를 생성했어요!')
      } else {
        addToast('error', `카드 생성 실패: ${result.error}`)
      }
    } catch (err: any) {
      console.error('[Video] AI card gen failed:', err)
      addToast('error', `AI 카드뉴스 생성 실패: ${err?.message || err}`)
    } finally {
      setAiGenerating(false)
      setVideoProgress({ step: '', percent: 0 })
    }
  }

  // ─── 합성 영상 생성 ───
  const handleCreateCompositeVideo = async () => {
    if (!window.api?.createCompositeVideo) {
      addToast('error', 'API가 초기화되지 않았습니다.')
      return
    }
    if (videoSlides.length === 0) {
      addToast('error', '카드 문구가 없습니다.')
      return
    }

    setVideoExporting(true)
    setVideoProgress({ step: '텍스트 패널을 캡처하고 있어요...', percent: 5 })

    try {
      await new Promise((r) => setTimeout(r, 500))
      const ref = textPanelRefs.current[0]
      if (!ref?.current) {
        throw new Error('텍스트 패널 렌더링 실패')
      }
      const textPanelDataUrl = await toPng(ref.current, {
        width: 1080,
        height: 432,
        pixelRatio: 1,
        cacheBust: true
      })
      const textPanelDataUrls = [textPanelDataUrl]

      let watermarkDataUrl: string | undefined
      if (videoSettings.watermark) {
        watermarkDataUrl = await generateWatermarkDataUrl()
      }

      setVideoProgress({ step: '영상을 합성하고 있어요...', percent: 15 })
      const trimDuration = videoTrim.endSec - videoTrim.startSec
      const result = await window.api.createCompositeVideo({
        videoUrl: videoSettings.videoUrl.trim() || undefined,
        localVideoPath: videoSettings.localVideoPath || undefined,
        textPanelDataUrls,
        videoDuration: trimDuration,
        startSec: videoTrim.startSec,
        bgmPath: videoSettings.bgmPath || undefined,
        removeAudio: videoSettings.removeAudio || undefined,
        watermarkDataUrl
      })

      if (result.success) {
        addToast('success', '카드 영상이 생성되었습니다!')
        close()
        resetWizard()
      } else {
        addToast('error', `영상 생성 실패: ${result.error}`)
      }
    } catch (err: any) {
      console.error('[Video] Composite export failed:', err)
      addToast('error', `영상 생성 실패: ${err?.message || err}`)
    } finally {
      setVideoExporting(false)
      setVideoProgress({ step: '', percent: 0 })
    }
  }

  // ─── 슬라이드쇼 영상 생성 ───
  const handleExportSlideshow = async () => {
    if (!canvasRef.current || !window.api?.exportVideo) return
    setVideoExporting(true)
    setVideoProgress({ step: '카드 이미지를 캡처하고 있어요...', percent: 5 })

    const originalUrls = slides.map((s) => s.backgroundImageUrl)
    const savedIndex = currentSlideIndex

    try {
      if (window.api?.proxyImage) {
        const cardStore = useCardStore.getState()
        for (let i = 0; i < cardStore.slides.length; i++) {
          const bg = cardStore.slides[i].backgroundImageUrl
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
              console.warn(`[Video] Proxy slide ${i + 1} image failed:`, err)
            }
          }
        }
        await new Promise((r) => setTimeout(r, 300))
      }

      const dataUrls: string[] = []
      for (let i = 0; i < slides.length; i++) {
        setCurrentSlide(i)
        await new Promise((r) => setTimeout(r, 500))
        const dataUrl = await canvasRef.current!.exportPng()
        dataUrls.push(dataUrl)
        setVideoProgress({
          step: `카드 캡처 중... (${i + 1}/${slides.length})`,
          percent: Math.round(5 + ((i + 1) / slides.length) * 10)
        })
      }

      setCurrentSlide(savedIndex)
      const restoredSlides = useCardStore.getState().slides.map((s, i) => ({
        ...s,
        backgroundImageUrl: originalUrls[i]
      }))
      useCardStore.setState({ slides: restoredSlides, cardData: restoredSlides[savedIndex] })

      setVideoProgress({ step: '영상을 생성하고 있어요...', percent: 15 })
      const result = await window.api.exportVideo({
        dataUrls,
        durationPerCard: videoSettings.durationPerCard,
        transitionDuration: videoSettings.transitionDuration,
        transitionType: videoSettings.transitionType,
        aspectRatio: videoSettings.aspectRatio,
        bgmPath: videoSettings.bgmPath || undefined,
        removeAudio: videoSettings.removeAudio || undefined
      })

      if (result.success) {
        addToast('success', '카드 영상이 생성되었습니다!')
        close()
      } else {
        addToast('error', `영상 생성 실패: ${result.error}`)
      }
    } catch (err) {
      console.error('[Video] Slideshow export failed:', err)
      addToast('error', '카드 영상 생성에 실패했습니다.')
      const restoredSlides = useCardStore.getState().slides.map((s, i) => ({
        ...s,
        backgroundImageUrl: originalUrls[i]
      }))
      useCardStore.setState({
        slides: restoredSlides,
        cardData: restoredSlides[useCardStore.getState().currentSlideIndex]
      })
    } finally {
      setVideoExporting(false)
      setVideoProgress({ step: '', percent: 0 })
    }
  }

  const handleExportVideo = () => {
    if (videoMode === 'slideshow') {
      handleExportSlideshow()
    }
  }

  // 최소화 상태 텍스트
  const statusText = videoExporting
    ? `${videoProgress.step || '생성 중...'} (${videoProgress.percent}%)`
    : aiGenerating
      ? 'AI 생성 중...'
      : undefined

  return (
    <>
      <FloatingWindow
        title="카드 영상 만들기"
        isOpen={isOpen}
        isMinimized={isMinimized}
        position={windowPosition}
        onClose={close}
        onToggleMinimize={toggleMinimize}
        onPositionChange={setWindowPosition}
        statusText={statusText}
      >
        {(videoExporting || aiGenerating) ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-3xl">{aiGenerating ? '🤖' : '🎬'}</div>
            <h3 className="text-lg font-bold text-text-dark dark:text-white">
              {aiGenerating ? 'AI 카드뉴스 생성 중...' : '영상 생성 중...'}
            </h3>
            <div className="w-full rounded-full bg-cream-dark dark:bg-gray-700">
              <div
                className="h-3 rounded-full bg-blue-accent transition-all duration-300"
                style={{ width: `${videoProgress.percent}%` }}
              />
            </div>
            <p className="text-sm text-text-gray dark:text-gray-400">
              {videoProgress.step || '준비 중...'} ({videoProgress.percent}%)
            </p>
          </div>
        ) : (
          <>
            {/* 모드 선택 탭 */}
            <div className="mb-5 flex rounded-lg bg-cream-dark p-1 dark:bg-gray-700">
              <button
                onClick={() => { setVideoMode('source'); resetWizard() }}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-all cursor-pointer ${
                  videoMode === 'source'
                    ? 'bg-white text-text-dark shadow-sm dark:bg-gray-600 dark:text-white'
                    : 'text-text-gray dark:text-gray-400'
                }`}
              >
                🔗 영상 + 카드뉴스
              </button>
              <button
                onClick={() => setVideoMode('slideshow')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-all cursor-pointer ${
                  videoMode === 'slideshow'
                    ? 'bg-white text-text-dark shadow-sm dark:bg-gray-600 dark:text-white'
                    : 'text-text-gray dark:text-gray-400'
                }`}
              >
                🖼️ 카드 슬라이드쇼
              </button>
            </div>

            {/* ─── 영상 + 카드뉴스 모드 (3단계 위자드) ─── */}
            {videoMode === 'source' && (
              <>
                {/* 스텝 인디케이터 */}
                <div className="mb-5 flex items-center justify-center gap-2">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                          videoStep === step
                            ? 'bg-blue-accent text-white'
                            : videoStep > step
                              ? 'bg-green-500 text-white'
                              : 'bg-cream-dark text-text-light dark:bg-gray-700 dark:text-gray-500'
                        }`}
                      >
                        {videoStep > step ? '✓' : step}
                      </div>
                      {step < 3 && (
                        <div className={`h-0.5 w-8 ${videoStep > step ? 'bg-green-500' : 'bg-cream-dark dark:bg-gray-700'}`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mb-4 text-center text-xs text-text-light dark:text-gray-500">
                  {videoStep === 1 && '① 영상 정보 입력'}
                  {videoStep === 2 && '② 카드뉴스 문구 확인/수정'}
                  {videoStep === 3 && '③ 영상 생성'}
                </div>

                {/* Step 1: 영상 정보 입력 */}
                {videoStep === 1 && (
                  <>
                    <div className="mb-4">
                      <label className="mb-1 block text-sm font-medium text-text-dark dark:text-gray-200">
                        영상 링크 (YouTube, Instagram 등)
                      </label>
                      <input
                        type="text"
                        value={videoSettings.videoUrl}
                        onChange={(e) =>
                          setVideoSettings((p) => ({ ...p, videoUrl: e.target.value, localVideoPath: '' }))
                        }
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm focus:border-blue-accent focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div className="mb-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-cream-dark dark:bg-gray-600" />
                      <span className="text-xs text-text-light dark:text-gray-500">또는</span>
                      <div className="h-px flex-1 bg-cream-dark dark:bg-gray-600" />
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSelectLocalVideo}
                          className="rounded-lg border border-cream-dark px-3 py-2 text-sm text-text-gray hover:bg-cream-dark/50 cursor-pointer dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          📁 파일 선택
                        </button>
                        <span className="flex-1 truncate text-sm text-text-light dark:text-gray-500">
                          {videoSettings.localVideoPath
                            ? videoSettings.localVideoPath.split(/[/\\]/).pop()
                            : '선택된 파일 없음'}
                        </span>
                        {videoSettings.localVideoPath && (
                          <button
                            onClick={() => setVideoSettings((p) => ({ ...p, localVideoPath: '' }))}
                            className="text-red-400 hover:text-red-500 cursor-pointer text-sm"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mb-4 mt-2 border-t border-cream-dark dark:border-gray-600" />

                    <div className="mb-4 rounded-lg border border-blue-accent/30 bg-blue-accent/5 p-4 dark:bg-blue-accent/10">
                      <h4 className="mb-2 text-sm font-bold text-blue-accent">
                        🤖 AI 카드뉴스 문구 생성
                      </h4>
                      <p className="mb-3 text-xs text-text-light dark:text-gray-400">
                        위 영상 링크의 정보와 아래 설명글을 바탕으로 AI가 카드뉴스 문구를 자동 생성해요.
                      </p>

                      <textarea
                        value={videoSettings.userContext}
                        onChange={(e) =>
                          setVideoSettings((p) => ({ ...p, userContext: e.target.value }))
                        }
                        placeholder="영상을 설명하는 글이나 소개글을 붙여넣어 주세요 (영상 내용, 핵심 정보, 숫자 등)"
                        rows={4}
                        className="mb-3 w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm focus:border-blue-accent focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white resize-none"
                      />

                      <button
                        onClick={handleGenerateCardsFromVideo}
                        disabled={!videoSettings.videoUrl.trim() || aiGenerating}
                        className="w-full rounded-lg bg-blue-accent px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-30 disabled:bg-gray-400 cursor-pointer disabled:cursor-not-allowed transition-all"
                      >
                        {aiGenerating ? '생성 중...' : '🤖 AI 카드뉴스 생성하기 →'}
                      </button>
                      {!videoSettings.videoUrl.trim() && (
                        <p className="mt-1 text-xs text-orange-500">⚠️ 위에 영상 링크를 먼저 입력해주세요</p>
                      )}
                    </div>

                    <div className="mb-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-cream-dark dark:bg-gray-600" />
                      <span className="text-xs text-text-light dark:text-gray-500">또는</span>
                      <div className="h-px flex-1 bg-cream-dark dark:bg-gray-600" />
                    </div>

                    <button
                      onClick={() => {
                        setVideoSlides([{ keyword: '', description: '' }])
                        if (!videoInfo) {
                          setVideoInfo({ title: '수동 입력', duration: 60 })
                        }
                        setVideoTrim({ startSec: 0, endSec: videoInfo?.duration ? Math.min(videoInfo.duration, 60) : 60 })
                        setVideoStep(2)
                      }}
                      disabled={!videoSettings.videoUrl.trim() && !videoSettings.localVideoPath}
                      className="mb-4 w-full rounded-lg border-2 border-dashed border-cream-dark py-2.5 text-sm font-medium text-text-gray hover:border-blue-accent hover:text-blue-accent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all dark:border-gray-600 dark:text-gray-400"
                    >
                      ✏️ AI 없이 직접 문구 입력하기 →
                    </button>

                    <div className="flex justify-end">
                      <Button variant="ghost" onClick={close}>
                        취소
                      </Button>
                    </div>
                  </>
                )}

                {/* Step 2: 카드뉴스 문구 확인/수정 */}
                {videoStep === 2 && videoSlides.length > 0 && (
                  <>
                    {videoInfo && (
                      <div className="mb-4 rounded-lg bg-cream-dark/50 p-3 dark:bg-gray-700/50">
                        <p className="text-sm font-medium text-text-dark dark:text-gray-200">
                          📹 {videoInfo.title}
                        </p>
                        <p className="text-xs text-text-light dark:text-gray-500">
                          원본 길이: {Math.floor(videoInfo.duration / 60)}분 {Math.round(videoInfo.duration % 60)}초
                          {videoInfo.duration > 60 && (
                            <span className="ml-1 text-orange-500 font-medium">
                              (60초 초과 — 아래에서 구간을 선택해주세요)
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* 영상 구간 설정 */}
                    {videoInfo && (() => {
                      const trimLen = videoTrim.endSec - videoTrim.startSec
                      const isOver60 = trimLen > 60
                      const dur = Math.round(videoInfo.duration)
                      const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`

                      return (
                        <div className={`mb-4 rounded-lg border p-4 dark:border-gray-600 ${isOver60 ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-cream-dark'}`}>
                          <span className="mb-3 block text-xs font-bold text-blue-accent">✂️ 영상 구간 (최대 60초)</span>

                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="mb-1 block text-xs text-text-light dark:text-gray-500">시작 지점</label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={Math.max(0, dur - 1)}
                                  value={videoTrim.startSec}
                                  onChange={(e) => {
                                    const s = Math.max(0, Math.min(Math.round(Number(e.target.value)), dur - 1))
                                    setVideoTrim({
                                      startSec: s,
                                      endSec: Math.max(s + 1, videoTrim.endSec)
                                    })
                                  }}
                                  className="w-20 rounded border border-cream-dark bg-white px-2 py-1.5 text-sm text-center focus:border-blue-accent focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                                <span className="text-xs text-text-light">초 ({fmt(videoTrim.startSec)})</span>
                              </div>
                            </div>
                            <div className="pt-4 text-text-light text-lg">~</div>
                            <div className="flex-1">
                              <label className="mb-1 block text-xs text-text-light dark:text-gray-500">끝 지점</label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={videoTrim.startSec + 1}
                                  max={dur}
                                  value={videoTrim.endSec}
                                  onChange={(e) => {
                                    const end = Math.max(videoTrim.startSec + 1, Math.min(Math.round(Number(e.target.value)), dur))
                                    setVideoTrim({ ...videoTrim, endSec: end })
                                  }}
                                  className="w-20 rounded border border-cream-dark bg-white px-2 py-1.5 text-sm text-center focus:border-blue-accent focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                                <span className="text-xs text-text-light">초 ({fmt(videoTrim.endSec)})</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3">
                            <label className="mb-0.5 block text-xs text-text-light dark:text-gray-500">시작 지점</label>
                            <input
                              type="range"
                              min={0}
                              max={Math.max(0, dur - 1)}
                              value={videoTrim.startSec}
                              onChange={(e) => {
                                const s = Number(e.target.value)
                                setVideoTrim({
                                  startSec: s,
                                  endSec: Math.max(s + 1, videoTrim.endSec)
                                })
                              }}
                              className="w-full accent-blue-accent"
                            />
                          </div>

                          <div className="mt-1">
                            <label className="mb-0.5 block text-xs text-text-light dark:text-gray-500">끝 지점</label>
                            <input
                              type="range"
                              min={videoTrim.startSec + 1}
                              max={dur}
                              value={videoTrim.endSec}
                              onChange={(e) => {
                                const end = Number(e.target.value)
                                setVideoTrim({ ...videoTrim, endSec: end })
                              }}
                              className="w-full accent-orange-500"
                            />
                          </div>

                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-text-light dark:text-gray-500">0초</span>
                            <span className={`font-bold ${isOver60 ? 'text-red-500' : 'text-blue-accent'}`}>
                              선택 구간: {trimLen}초 {isOver60 && '⚠️ 60초 초과!'}
                            </span>
                            <span className="text-text-light dark:text-gray-500">{dur}초</span>
                          </div>

                          {isOver60 && (
                            <p className="mt-2 rounded bg-red-100 px-3 py-1.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                              ⚠️ 선택 구간이 60초를 초과했습니다. 시작 또는 끝 지점을 조정해주세요.
                            </p>
                          )}
                        </div>
                      )
                    })()}

                    <div className="mb-4 rounded-lg border border-cream-dark p-4 dark:border-gray-600">
                      <span className="mb-3 block text-xs font-bold text-blue-accent">📝 카드뉴스 문구</span>
                      <input
                        type="text"
                        value={videoSlides[0].keyword}
                        onChange={(e) => {
                          setVideoSlides([{ ...videoSlides[0], keyword: e.target.value }])
                        }}
                        placeholder="키워드 (제목)"
                        className="mb-3 w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm font-bold focus:border-blue-accent focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                      <textarea
                        value={videoSlides[0].description}
                        onChange={(e) => {
                          setVideoSlides([{ ...videoSlides[0], description: e.target.value }])
                        }}
                        placeholder="설명"
                        rows={4}
                        className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm focus:border-blue-accent focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white resize-none"
                      />
                    </div>

                    <p className="mb-4 text-xs text-text-light dark:text-gray-500">
                      영상 상단(60%)에 원본 영상이 재생되고, 하단(40%)에 위 문구가 표시됩니다.
                    </p>

                    <div className="flex justify-between">
                      <Button variant="ghost" onClick={() => setVideoStep(1)}>
                        ← 이전
                      </Button>
                      <Button
                        onClick={() => setVideoStep(3)}
                        disabled={!videoSlides[0]?.keyword.trim() || (videoTrim.endSec - videoTrim.startSec) > 60}
                      >
                        다음 →
                      </Button>
                    </div>
                  </>
                )}

                {/* Step 3: 영상 생성 설정 */}
                {videoStep === 3 && (
                  <>
                    <div className="mb-4 rounded-lg bg-blue-accent/5 p-4 dark:bg-blue-accent/10">
                      <h4 className="mb-2 text-sm font-bold text-text-dark dark:text-white">📋 영상 구성</h4>
                      <div className="space-y-1 text-sm text-text-gray dark:text-gray-400">
                        <p>
                          사용 구간: <span className="font-bold text-blue-accent">{videoTrim.startSec}초 ~ {videoTrim.endSec}초 ({videoTrim.endSec - videoTrim.startSec}초)</span>
                          {videoInfo && videoInfo.duration > 60 && (
                            <span className="ml-1 text-xs text-text-light">(원본 {Math.round(videoInfo.duration)}초)</span>
                          )}
                        </p>
                        <p className="font-medium text-text-dark dark:text-gray-200">
                          📝 {videoSlides[0]?.keyword}
                        </p>
                        <p className="text-xs">{videoSlides[0]?.description}</p>
                        <p className="mt-2 text-xs text-text-light">
                          상단(60%)에 영상이 재생되고, 하단(40%)에 카드뉴스 문구가 표시됩니다.
                        </p>
                      </div>
                    </div>

                    {/* 워터마크 */}
                    <div className="mb-4">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-text-dark dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={videoSettings.watermark}
                          onChange={(e) =>
                            setVideoSettings((p) => ({ ...p, watermark: e.target.checked }))
                          }
                          className="accent-blue-accent w-4 h-4 cursor-pointer"
                        />
                        💧 워터마크 표시
                      </label>
                      <p className="mt-1 ml-6 text-xs text-text-light dark:text-gray-500">
                        영상 좌측 상단에 워터마크를 반투명하게 표시합니다.
                      </p>
                    </div>

                    {/* BGM */}
                    <div className="mb-4">
                      <label className="mb-1 block text-sm font-medium text-text-dark dark:text-gray-200">
                        배경음악 (선택)
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSelectBgm}
                          disabled={videoSettings.removeAudio}
                          className={`rounded-lg border border-cream-dark px-3 py-2 text-sm text-text-gray hover:bg-cream-dark/50 cursor-pointer dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 ${videoSettings.removeAudio ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          🎵 파일 선택
                        </button>
                        <span className="flex-1 truncate text-sm text-text-light dark:text-gray-500">
                          {videoSettings.removeAudio
                            ? '음소거 (오디오 없음)'
                            : videoSettings.bgmPath
                              ? videoSettings.bgmPath.split(/[/\\]/).pop()
                              : '없음 (원본 오디오 유지)'}
                        </span>
                        {videoSettings.bgmPath && !videoSettings.removeAudio && (
                          <button
                            onClick={() => setVideoSettings((p) => ({ ...p, bgmPath: '' }))}
                            className="text-red-400 hover:text-red-500 cursor-pointer text-sm"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 오디오 제거 */}
                    <div className="mb-6">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-text-dark dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={videoSettings.removeAudio}
                          onChange={(e) =>
                            setVideoSettings((p) => ({
                              ...p,
                              removeAudio: e.target.checked,
                              bgmPath: e.target.checked ? '' : p.bgmPath
                            }))
                          }
                          className="accent-blue-accent w-4 h-4 cursor-pointer"
                        />
                        🔇 배경음악 제거 (무음 영상)
                      </label>
                      <p className="mt-1 ml-6 text-xs text-text-light dark:text-gray-500">
                        원본 오디오와 배경음악 없이 무음으로 영상을 생성합니다.
                      </p>
                    </div>

                    <div className="flex justify-between">
                      <Button variant="ghost" onClick={() => setVideoStep(2)}>
                        ← 이전
                      </Button>
                      <Button onClick={handleCreateCompositeVideo}>
                        🎬 영상 생성
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ─── 슬라이드쇼 모드 ─── */}
            {videoMode === 'slideshow' && (
              <>
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-text-dark dark:text-gray-200">
                    카드당 시간: {videoSettings.durationPerCard}초
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    step={0.5}
                    value={videoSettings.durationPerCard}
                    onChange={(e) =>
                      setVideoSettings((p) => ({ ...p, durationPerCard: Number(e.target.value) }))
                    }
                    className="w-full accent-blue-accent"
                  />
                  <div className="flex justify-between text-xs text-text-light dark:text-gray-500">
                    <span>1초</span><span>6초</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-text-dark dark:text-gray-200">
                    전환 효과
                  </label>
                  <select
                    value={videoSettings.transitionType}
                    onChange={(e) =>
                      setVideoSettings((p) => ({ ...p, transitionType: e.target.value }))
                    }
                    className="w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="fade">Fade (페이드)</option>
                    <option value="dissolve">Dissolve (디졸브)</option>
                    <option value="wipeleft">Wipe Left (왼쪽 와이프)</option>
                    <option value="wiperight">Wipe Right (오른쪽 와이프)</option>
                    <option value="slidedown">Slide Down (슬라이드 다운)</option>
                    <option value="slideup">Slide Up (슬라이드 업)</option>
                  </select>
                </div>

                <p className="mb-4 text-xs text-text-light dark:text-gray-500">
                  {slides.length}장의 카드로 약 {(
                    slides.length * videoSettings.durationPerCard -
                    (slides.length - 1) * videoSettings.transitionDuration
                  ).toFixed(1)}초 영상이 만들어집니다.
                </p>

                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-text-dark dark:text-gray-200">
                    비율
                  </label>
                  <div className="flex gap-3">
                    {(['1:1', '9:16'] as const).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setVideoSettings((p) => ({ ...p, aspectRatio: ratio }))}
                        className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
                          videoSettings.aspectRatio === ratio
                            ? 'border-blue-accent bg-blue-accent/10 text-blue-accent'
                            : 'border-cream-dark text-text-gray hover:border-blue-accent/30 dark:border-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {ratio === '1:1' ? '⬜ 1:1 정사각형' : '📱 9:16 세로'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-text-dark dark:text-gray-200">
                    배경음악 (선택)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectBgm}
                      disabled={videoSettings.removeAudio}
                      className={`rounded-lg border border-cream-dark px-3 py-2 text-sm text-text-gray hover:bg-cream-dark/50 cursor-pointer dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 ${videoSettings.removeAudio ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      🎵 파일 선택
                    </button>
                    <span className="flex-1 truncate text-sm text-text-light dark:text-gray-500">
                      {videoSettings.removeAudio
                        ? '음소거 (오디오 없음)'
                        : videoSettings.bgmPath
                          ? videoSettings.bgmPath.split(/[/\\]/).pop()
                          : '없음'}
                    </span>
                    {videoSettings.bgmPath && !videoSettings.removeAudio && (
                      <button
                        onClick={() => setVideoSettings((p) => ({ ...p, bgmPath: '' }))}
                        className="text-red-400 hover:text-red-500 cursor-pointer text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-text-dark dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={videoSettings.removeAudio}
                      onChange={(e) =>
                        setVideoSettings((p) => ({
                          ...p,
                          removeAudio: e.target.checked,
                          bgmPath: e.target.checked ? '' : p.bgmPath
                        }))
                      }
                      className="accent-blue-accent w-4 h-4 cursor-pointer"
                    />
                    🔇 배경음악 제거 (무음 영상)
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={close}>
                    취소
                  </Button>
                  <Button onClick={handleExportVideo}>
                    영상 생성
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </FloatingWindow>

      {/* 슬라이드쇼 캡처용 숨겨진 CardCanvas */}
      {isOpen && videoMode === 'slideshow' && (
        <div style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none' }}>
          <CardCanvas ref={canvasRef} scale={1} slideIndex={currentSlideIndex} />
        </div>
      )}

      {/* 텍스트 패널 캡처용 오프스크린 렌더링 */}
      {isOpen && videoStep === 3 && videoSlides.length > 0 && (
        <div style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none' }}>
          {videoSlides.map((slide, i) => (
            <TextPanelCapture
              key={i}
              ref={textPanelRefs.current[i]}
              keyword={slide.keyword}
              description={slide.description}
              slideIndex={i}
            />
          ))}
        </div>
      )}
    </>
  )
}
