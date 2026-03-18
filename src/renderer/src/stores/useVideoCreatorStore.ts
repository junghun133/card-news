import { create } from 'zustand'

interface VideoSettings {
  aspectRatio: '1:1' | '9:16'
  bgmPath: string
  removeAudio: boolean
  watermark: boolean
  durationPerCard: number
  transitionDuration: number
  transitionType: string
  videoUrl: string
  localVideoPath: string
  userContext: string
}

interface OverlaySettings {
  text: string
  position: { x: number; y: number } // 0~1 비율 (좌상단 기준)
  duration: number                    // 노출 시간 (초)
  frameDataUrl: string                // 트림 시작 프레임 캡처
}

export interface SubtitleEntry {
  index: number
  startTime: string   // "00:00:01,000"
  endTime: string     // "00:00:03,500"
  startSec: number
  endSec: number
  text: string
}

interface SubtitleSettings {
  originalEntries: SubtitleEntry[]    // 원본 (외국어)
  translatedEntries: SubtitleEntry[]  // 번역 (한국어, 편집 가능)
  isExtracting: boolean
  isTranslating: boolean
}

interface VideoCreatorStore {
  // 윈도우 상태
  isOpen: boolean
  isMinimized: boolean
  windowPosition: { x: number; y: number }

  // 영상 생성 상태
  videoExporting: boolean
  videoProgress: { step: string; percent: number }
  videoMode: 'slideshow' | 'source' | 'overlay' | 'subtitle'
  videoSettings: VideoSettings
  aiGenerating: boolean

  // 위자드 상태 (overlay/subtitle 모드는 4단계)
  videoStep: 1 | 2 | 3 | 4
  videoSlides: { keyword: string; description: string }[]
  videoInfo: { title: string; duration: number } | null
  videoTrim: { startSec: number; endSec: number }

  // 오버레이 설정
  overlaySettings: OverlaySettings

  // 자막 설정
  subtitleSettings: SubtitleSettings

  // 윈도우 액션
  open: () => void
  close: () => void
  toggleMinimize: () => void
  setWindowPosition: (pos: { x: number; y: number }) => void

  // 상태 액션
  setVideoExporting: (v: boolean) => void
  setVideoProgress: (p: { step: string; percent: number }) => void
  setVideoMode: (m: 'slideshow' | 'source' | 'overlay' | 'subtitle') => void
  setVideoSettings: (fn: (prev: VideoSettings) => VideoSettings) => void
  setAiGenerating: (v: boolean) => void
  setVideoStep: (s: 1 | 2 | 3 | 4) => void
  setVideoSlides: (slides: { keyword: string; description: string }[]) => void
  setVideoInfo: (info: { title: string; duration: number } | null) => void
  setVideoTrim: (trim: { startSec: number; endSec: number }) => void
  setOverlaySettings: (fn: (prev: OverlaySettings) => OverlaySettings) => void
  setSubtitleSettings: (fn: (prev: SubtitleSettings) => SubtitleSettings) => void

  // 위자드 리셋
  resetWizard: () => void
}

const DEFAULT_SETTINGS: VideoSettings = {
  aspectRatio: '1:1',
  bgmPath: '',
  removeAudio: false,
  watermark: true,
  durationPerCard: 3,
  transitionDuration: 0.5,
  transitionType: 'fade',
  videoUrl: '',
  localVideoPath: '',
  userContext: ''
}

const DEFAULT_OVERLAY: OverlaySettings = {
  text: '',
  position: { x: 0.5, y: 0.35 },
  duration: 2.5,
  frameDataUrl: ''
}

const DEFAULT_SUBTITLE: SubtitleSettings = {
  originalEntries: [],
  translatedEntries: [],
  isExtracting: false,
  isTranslating: false
}

export const useVideoCreatorStore = create<VideoCreatorStore>((set) => ({
  isOpen: false,
  isMinimized: false,
  windowPosition: { x: -1, y: -1 },

  videoExporting: false,
  videoProgress: { step: '', percent: 0 },
  videoMode: 'source',
  videoSettings: { ...DEFAULT_SETTINGS },
  aiGenerating: false,

  videoStep: 1,
  videoSlides: [],
  videoInfo: null,
  videoTrim: { startSec: 0, endSec: 60 },

  overlaySettings: { ...DEFAULT_OVERLAY },
  subtitleSettings: { ...DEFAULT_SUBTITLE },

  open: () => set({ isOpen: true, isMinimized: false }),
  close: () => set((s) => {
    if (s.videoExporting || s.aiGenerating) return s
    return { isOpen: false, isMinimized: false }
  }),
  toggleMinimize: () => set((s) => ({ isMinimized: !s.isMinimized })),
  setWindowPosition: (pos) => set({ windowPosition: pos }),

  setVideoExporting: (v) => set({ videoExporting: v }),
  setVideoProgress: (p) => set({ videoProgress: p }),
  setVideoMode: (m) => set({ videoMode: m }),
  setVideoSettings: (fn) => set((s) => ({ videoSettings: fn(s.videoSettings) })),
  setAiGenerating: (v) => set({ aiGenerating: v }),
  setVideoStep: (s) => set({ videoStep: s }),
  setVideoSlides: (slides) => set({ videoSlides: slides }),
  setVideoInfo: (info) => set({ videoInfo: info }),
  setVideoTrim: (trim) => set({ videoTrim: trim }),
  setOverlaySettings: (fn) => set((s) => ({ overlaySettings: fn(s.overlaySettings) })),
  setSubtitleSettings: (fn) => set((s) => ({ subtitleSettings: fn(s.subtitleSettings) })),

  resetWizard: () => set({
    videoStep: 1,
    videoSlides: [],
    videoInfo: null,
    videoTrim: { startSec: 0, endSec: 60 },
    videoMode: 'source',
    videoSettings: { ...DEFAULT_SETTINGS },
    overlaySettings: { ...DEFAULT_OVERLAY },
    subtitleSettings: { ...DEFAULT_SUBTITLE },
    videoExporting: false,
    videoProgress: { step: '', percent: 0 },
    aiGenerating: false
  })
}))
