import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import SearchPage from '@/pages/SearchPage'
import EditorPage from '@/pages/EditorPage'
import SettingsPage from '@/pages/SettingsPage'
import ToastContainer from '@/components/common/Toast'
import { useThemeStore } from '@/stores/useThemeStore'

const NAV_ITEMS = [
  { to: '/', label: '뉴스 검색', icon: '🔍' },
  { to: '/editor', label: '카드 편집', icon: '🎨' },
  { to: '/settings', label: '설정', icon: '⚙️' }
]

export default function App() {
  const { dark, toggle } = useThemeStore()

  return (
    <HashRouter>
      <div className="flex h-screen bg-cream dark:bg-gray-900">
        {/* 사이드바 */}
        <nav className="flex w-56 flex-col border-r border-cream-dark bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-cream-dark px-5 py-5 dark:border-gray-700">
            <h1 className="text-xl font-bold text-text-dark dark:text-white">카드뉴스 제조기</h1>
            <p className="mt-1 text-xs text-text-light">AI / 주식 / 전쟁 뉴스</p>
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
          </div>
          <div className="flex items-center justify-between border-t border-cream-dark p-4 dark:border-gray-700">
            <span className="text-xs text-text-light">v1.1.0</span>
            <button
              onClick={toggle}
              className="rounded-lg px-2 py-1 text-xs text-text-gray hover:bg-cream-dark dark:text-gray-400 dark:hover:bg-gray-700 cursor-pointer"
              title={dark ? '라이트 모드' : '다크 모드'}
            >
              {dark ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </nav>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-hidden p-6">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
      <ToastContainer />
    </HashRouter>
  )
}
