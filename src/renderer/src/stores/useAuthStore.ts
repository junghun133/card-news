import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthStore {
  authenticated: boolean
  adminPassword: string
  setAdminPassword: (pw: string) => void
  login: (pw: string) => boolean
  logout: () => void
}

const DEFAULT_PASSWORD = 'admin'

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      authenticated: false,
      adminPassword: DEFAULT_PASSWORD,

      setAdminPassword: (pw) => set({ adminPassword: pw }),

      login: (pw) => {
        if (pw === get().adminPassword) {
          set({ authenticated: true })
          return true
        }
        return false
      },

      logout: () => set({ authenticated: false })
    }),
    {
      name: 'card-news-auth',
      partialize: (state) => ({
        authenticated: state.authenticated,
        adminPassword: state.adminPassword
      })
    }
  )
)
