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

interface VideoCreatorStore {
  // 윈도우 상태
  isOpen: boolean
  isMinimized: boolean
  windowPosition: { x: number; y: number }

  // 영상 생성 상태
  videoExporting: boolean
  videoProgress: { step: string; percent: number }
  videoMode: 'slideshow' | 'source'
  videoSettings: VideoSettings
  aiGenerating: boolean

  // 3단계 위자드 상태
  videoStep: 1 | 2 | 3
  videoSlides: { keyword: string; description: string }[]
  videoInfo: { title: string; duration: number } | null
  videoTrim: { startSec: number; endSec: number }

  // 윈도우 액션
  open: () => void
  close: () => void
  toggleMinimize: () => void
  setWindowPosition: (pos: { x: number; y: number }) => void

  // 상태 액션
  setVideoExporting: (v: boolean) => void
  setVideoProgress: (p: { step: string; percent: number }) => void
  setVideoMode: (m: 'slideshow' | 'source') => void
  setVideoSettings: (fn: (prev: VideoSettings) => VideoSettings) => void
  setAiGenerating: (v: boolean) => void
  setVideoStep: (s: 1 | 2 | 3) => void
  setVideoSlides: (slides: { keyword: string; description: string }[]) => void
  setVideoInfo: (info: { title: string; duration: number } | null) => void
  setVideoTrim: (trim: { startSec: number; endSec: number }) => void

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

export const useVideoCreatorStore = create<VideoCreatorStore>((set) => ({
  // 윈도우 초기 상태
  isOpen: false,
  isMinimized: false,
  windowPosition: { x: -1, y: -1 }, // -1 = 아직 초기화 안됨 (센터로 계산)

  // 영상 생성 초기 상태
  videoExporting: false,
  videoProgress: { step: '', percent: 0 },
  videoMode: 'source',
  videoSettings: { ...DEFAULT_SETTINGS },
  aiGenerating: false,

  // 위자드 초기 상태
  videoStep: 1,
  videoSlides: [],
  videoInfo: null,
  videoTrim: { startSec: 0, endSec: 60 },

  // 윈도우 액션
  open: () => set({ isOpen: true, isMinimized: false }),
  close: () => set((s) => {
    if (s.videoExporting || s.aiGenerating) return s // 생성 중에는 닫기 방지
    return { isOpen: false, isMinimized: false }
  }),
  toggleMinimize: () => set((s) => ({ isMinimized: !s.isMinimized })),
  setWindowPosition: (pos) => set({ windowPosition: pos }),

  // 상태 액션
  setVideoExporting: (v) => set({ videoExporting: v }),
  setVideoProgress: (p) => set({ videoProgress: p }),
  setVideoMode: (m) => set({ videoMode: m }),
  setVideoSettings: (fn) => set((s) => ({ videoSettings: fn(s.videoSettings) })),
  setAiGenerating: (v) => set({ aiGenerating: v }),
  setVideoStep: (s) => set({ videoStep: s }),
  setVideoSlides: (slides) => set({ videoSlides: slides }),
  setVideoInfo: (info) => set({ videoInfo: info }),
  setVideoTrim: (trim) => set({ videoTrim: trim }),

  // 위자드 리셋
  resetWizard: () => set({
    videoStep: 1,
    videoSlides: [],
    videoInfo: null,
    videoTrim: { startSec: 0, endSec: 60 },
    videoMode: 'source',
    videoSettings: { ...DEFAULT_SETTINGS },
    videoExporting: false,
    videoProgress: { step: '', percent: 0 },
    aiGenerating: false
  })
}))
