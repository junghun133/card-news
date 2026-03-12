import { create } from 'zustand'

interface ThemeStore {
  dark: boolean
  toggle: () => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
  dark: false,
  toggle: () =>
    set((s) => {
      const next = !s.dark
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('theme', next ? 'dark' : 'light')
      return { dark: next }
    })
}))

// 초기화: localStorage에서 테마 복원
const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null
if (saved === 'dark') {
  document.documentElement.classList.add('dark')
  useThemeStore.setState({ dark: true })
}
