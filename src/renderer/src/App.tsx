import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import SearchPage from '@/pages/SearchPage'
import EditorPage from '@/pages/EditorPage'
import SettingsPage from '@/pages/SettingsPage'
import LoginPage from '@/pages/LoginPage'
import ProjectsPage from '@/pages/ProjectsPage'
import AuthGuard from '@/components/common/AuthGuard'
import ToastContainer from '@/components/common/Toast'
import VideoCreatorPanel from '@/components/video/VideoCreatorPanel'
import { useThemeStore } from '@/stores/useThemeStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useVideoCreatorStore } from '@/stores/useVideoCreatorStore'

const NAV_ITEMS = [
  { to: '/', label: '뉴스 검색', icon: '🔍' },
  { to: '/editor', label: '카드 편집', icon: '🎨' },
  { to: '/projects', label: '저장된 프로젝트', icon: '📁' },
  { to: '/settings', label: '설정', icon: '⚙️' }
]

function AppLayout() {
  const { dark, toggle } = useThemeStore()
  const logout = useAuthStore((s) => s.logout)
  const { isOpen: videoCreatorOpen, open: openVideoCreator } = useVideoCreatorStore()

  return (
    <div className="flex h-screen bg-cream dark:bg-gray-900">
      {/* 사이드바 */}
      <nav className="flex w-56 flex-col border-r border-cream-dark bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-cream-dark px-5 py-5 dark:border-gray-700">
          <h1 className="text-xl font-bold text-text-dark dark:text-white">카드뉴스 제조기</h1>
          <p className="mt-1 text-xs text-text-light">AI · 기술 · 경제 · 사회 · 과학</p>
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-light-blue/40 text-blue-accent dark:bg-blue-accent/20'
                    : 'text-text-gray hover:bg-cream-dark/50 dark:text-gray-400 dark:hover:bg-gray-700'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {/* 구분선 */}
          <div className="my-1 border-t border-cream-dark dark:border-gray-700" />

          {/* 카드 영상 만들기 (플로팅 윈도우 토글) */}
          <button
            onClick={openVideoCreator}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all cursor-pointer ${
              videoCreatorOpen
                ? 'bg-light-blue/40 text-blue-accent dark:bg-blue-accent/20'
                : 'text-text-gray hover:bg-cream-dark/50 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <span>🎬</span>
            카드영상만들기
          </button>
        </div>

        {/* 하단: 로그아웃 + 테마 */}
        <div className="border-t border-cream-dark p-4 dark:border-gray-700">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-text-light">v1.2.0</span>
            <button
              onClick={logout}
              className="rounded px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
            >
              잠금
            </button>
          </div>
          <button
            onClick={toggle}
            className="w-full rounded-lg px-2 py-1 text-xs text-text-gray hover:bg-cream-dark dark:text-gray-400 dark:hover:bg-gray-700 cursor-pointer"
            title={dark ? '라이트 모드' : '다크 모드'}
          >
            {dark ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto p-6">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <AppLayout />
              <VideoCreatorPanel />
            </AuthGuard>
          }
        />
      </Routes>
      <ToastContainer />
    </HashRouter>
  )
}
