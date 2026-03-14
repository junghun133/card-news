import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '@/components/common/Button'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToastStore } from '@/stores/useToastStore'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const addToast = useToastStore((s) => s.addToast)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      addToast('error', '비밀번호를 입력해주세요.')
      return
    }

    const ok = login(password)
    if (ok) {
      navigate('/')
    } else {
      addToast('error', '비밀번호가 틀렸습니다.')
      setPassword('')
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-cream dark:bg-gray-900">
      <div className="w-full max-w-sm rounded-2xl border border-cream-dark bg-white p-8 shadow-lg dark:border-gray-600 dark:bg-gray-800">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-text-dark dark:text-white">
            카드뉴스 제조기
          </h1>
          <p className="mt-1 text-sm text-text-light dark:text-gray-400">
            관리자 비밀번호를 입력하세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-gray dark:text-gray-400">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full rounded-lg border border-cream-dark bg-white px-4 py-2.5 text-text-dark outline-none focus:border-blue-accent focus:ring-1 focus:ring-blue-accent transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
              autoFocus
            />
          </label>

          <Button className="mt-2 w-full">
            입장
          </Button>
        </form>
      </div>
    </div>
  )
}
