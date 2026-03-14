import { useState, useEffect } from 'react'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { syncKeysToCloud, loadKeysFromCloud } from '@/lib/apiKeySync'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { LlmProvider } from '@/types'

interface ValidationResult {
  serper: boolean | null
  openai: boolean | null
  unsplash: boolean | null
  naver: boolean | null
  gemini: boolean | null
}

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    serperApiKey: '',
    openaiApiKey: '',
    unsplashAccessKey: '',
    naverClientId: '',
    naverClientSecret: '',
    geminiApiKey: '',
    llmProvider: 'openai' as LlmProvider
  })
  const [saved, setSaved] = useState(false)
  const [validating, setValidating] = useState(false)
  const [cloudSynced, setCloudSynced] = useState<boolean | null>(null)
  const [validation, setValidation] = useState<ValidationResult>({
    serper: null,
    openai: null,
    unsplash: null,
    naver: null,
    gemini: null
  })
  const addToast = useToastStore((s) => s.addToast)
  const [newPassword, setNewPassword] = useState('')
  const setAdminPassword = useAuthStore((s) => s.setAdminPassword)

  useEffect(() => {
    const loadSettings = async () => {
      // 1. 클라우드에서 먼저 시도
      if (isSupabaseConfigured) {
        const cloudKeys = await loadKeysFromCloud()
        if (cloudKeys && (cloudKeys.serper_api_key || cloudKeys.openai_api_key || cloudKeys.unsplash_access_key)) {
          setSettings({
            serperApiKey: cloudKeys.serper_api_key,
            openaiApiKey: cloudKeys.openai_api_key,
            unsplashAccessKey: cloudKeys.unsplash_access_key,
            naverClientId: cloudKeys.naver_client_id || '',
            naverClientSecret: cloudKeys.naver_client_secret || '',
            geminiApiKey: cloudKeys.gemini_api_key || '',
            llmProvider: (cloudKeys.llm_provider as LlmProvider) || 'openai'
          })
          setCloudSynced(true)
          // electron-store에도 동기화
          if (window.api) {
            await window.api.setSettings({
              serperApiKey: cloudKeys.serper_api_key,
              openaiApiKey: cloudKeys.openai_api_key,
              unsplashAccessKey: cloudKeys.unsplash_access_key,
              naverClientId: cloudKeys.naver_client_id || '',
              naverClientSecret: cloudKeys.naver_client_secret || '',
              geminiApiKey: cloudKeys.gemini_api_key || '',
              llmProvider: cloudKeys.llm_provider || 'openai'
            })
          }
          return
        }
      }

      // 2. 로컬 폴백
      if (window.api) {
        const local = await window.api.getSettings()
        setSettings({
          serperApiKey: local.serperApiKey || '',
          openaiApiKey: local.openaiApiKey || '',
          unsplashAccessKey: local.unsplashAccessKey || '',
          naverClientId: local.naverClientId || '',
          naverClientSecret: local.naverClientSecret || '',
          geminiApiKey: local.geminiApiKey || '',
          llmProvider: (local.llmProvider as LlmProvider) || 'openai'
        })
      }
    }

    loadSettings()
  }, [])

  const handleSave = async () => {
    // 로컬 저장
    if (window.api) {
      await window.api.setSettings(settings)
    }

    // 클라우드 저장
    if (isSupabaseConfigured) {
      const ok = await syncKeysToCloud({
        serper_api_key: settings.serperApiKey,
        openai_api_key: settings.openaiApiKey,
        unsplash_access_key: settings.unsplashAccessKey,
        naver_client_id: settings.naverClientId,
        naver_client_secret: settings.naverClientSecret,
        gemini_api_key: settings.geminiApiKey,
        llm_provider: settings.llmProvider
      })
      setCloudSynced(ok)
    }

    setSaved(true)
    addToast('success', 'API 키가 저장되었습니다.')
    setTimeout(() => setSaved(false), 2000)
  }

  const handleValidate = async () => {
    setValidating(true)
    if (window.api) {
      await window.api.setSettings(settings)
    }

    const result: ValidationResult = { serper: null, openai: null, unsplash: null, naver: null, gemini: null }

    if (window.api) {
      try {
        const r = await window.api.validateSettings()
        result.serper = r.serper
        result.openai = r.openai
        result.unsplash = r.unsplash
        result.naver = r.naver
        result.gemini = r.gemini
      } catch {
        addToast('error', '검증 중 오류가 발생했습니다.')
      }
    }

    setValidation(result)
    setValidating(false)

    const allResults = [result.serper, result.openai, result.unsplash, result.naver, result.gemini]
    const ok = allResults.filter(Boolean).length
    const total = allResults.filter((v) => v !== null).length
    if (ok === total && total > 0) {
      addToast('success', '모든 API 키가 유효합니다!')
    } else {
      addToast('error', `${total}개 중 ${ok}개 키가 유효합니다.`)
    }
  }

  const handleChangePassword = () => {
    if (!newPassword || newPassword.length < 2) {
      addToast('error', '비밀번호는 2자 이상 입력해주세요.')
      return
    }
    setAdminPassword(newPassword)
    setNewPassword('')
    addToast('success', '비밀번호가 변경되었습니다.')
  }

  const statusIcon = (v: boolean | null) => {
    if (v === null) return ''
    return v ? ' [valid]' : ' [invalid]'
  }

  const statusClass = (v: boolean | null) => {
    if (v === null) return ''
    return v ? 'border-green-400' : 'border-red-400'
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h2 className="text-2xl font-bold text-text-dark dark:text-white">설정</h2>

      {/* API 키 섹션 */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-text-dark dark:text-white">API 키</h3>
        <p className="mb-4 text-sm text-text-light">
          뉴스 검색, AI 요약, 배경 이미지 기능을 사용하려면 API 키를 입력해주세요.
        </p>

        {isSupabaseConfigured && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-accent/5 px-4 py-2.5 text-sm dark:bg-blue-accent/10">
            <span className={cloudSynced ? 'text-green-500' : 'text-text-light dark:text-gray-400'}>
              {cloudSynced === true ? '☁️ 클라우드 동기화됨' : cloudSynced === false ? '⚠️ 동기화 실패' : '☁️ 클라우드 저장 가능'}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-5 rounded-xl border border-cream-dark bg-white p-6 dark:border-gray-600 dark:bg-gray-800">
          {/* LLM 프로바이더 선택 */}
          <div className="border-b border-cream-dark pb-4 dark:border-gray-600">
            <p className="mb-2 text-xs font-medium text-text-light dark:text-gray-400">AI 엔진 선택</p>
            <div className="flex rounded-lg border border-cream-dark dark:border-gray-600 overflow-hidden">
              <button
                onClick={() => setSettings((s) => ({ ...s, llmProvider: 'openai' }))}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  settings.llmProvider === 'openai'
                    ? 'bg-blue-accent text-white'
                    : 'bg-white text-text-gray hover:bg-cream-light dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                OpenAI
              </button>
              <button
                onClick={() => setSettings((s) => ({ ...s, llmProvider: 'gemini' }))}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  settings.llmProvider === 'gemini'
                    ? 'bg-blue-accent text-white'
                    : 'bg-white text-text-gray hover:bg-cream-light dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Gemini
              </button>
            </div>
            <p className="mt-1.5 text-xs text-text-light dark:text-gray-500">
              {settings.llmProvider === 'openai'
                ? '카드뉴스 생성에 OpenAI GPT-4o-mini를 사용합니다.'
                : '카드뉴스 생성에 Google Gemini 2.0 Flash를 사용합니다.'}
            </p>
          </div>

          <div className={`rounded-lg ${statusClass(validation.serper)}`}>
            <Input
              label={`Serper API Key (뉴스 검색)${statusIcon(validation.serper)}`}
              value={settings.serperApiKey}
              onChange={(v) => setSettings((s) => ({ ...s, serperApiKey: v }))}
              placeholder="serper.dev에서 발급"
              type="password"
            />
          </div>
          <div className={`rounded-lg ${statusClass(validation.openai)}`}>
            <Input
              label={`OpenAI API Key (AI 요약/교차검증)${statusIcon(validation.openai)}`}
              value={settings.openaiApiKey}
              onChange={(v) => setSettings((s) => ({ ...s, openaiApiKey: v }))}
              placeholder="sk-..."
              type="password"
            />
          </div>
          <div className={`rounded-lg ${statusClass(validation.gemini)}`}>
            <Input
              label={`Gemini API Key (Google AI)${statusIcon(validation.gemini)}`}
              value={settings.geminiApiKey}
              onChange={(v) => setSettings((s) => ({ ...s, geminiApiKey: v }))}
              placeholder="aistudio.google.com에서 발급"
              type="password"
            />
          </div>
          <div className={`rounded-lg ${statusClass(validation.unsplash)}`}>
            <Input
              label={`Unsplash Access Key (배경 이미지)${statusIcon(validation.unsplash)}`}
              value={settings.unsplashAccessKey}
              onChange={(v) => setSettings((s) => ({ ...s, unsplashAccessKey: v }))}
              placeholder="unsplash.com에서 발급"
              type="password"
            />
          </div>

          {/* 네이버 API 키 */}
          <div className="border-t border-cream-dark pt-4 dark:border-gray-600">
            <p className="mb-3 text-xs font-medium text-text-light dark:text-gray-400">네이버 뉴스 검색 (선택사항)</p>
            <div className="flex flex-col gap-4">
              <div className={`rounded-lg ${statusClass(validation.naver)}`}>
                <Input
                  label={`Naver Client ID${statusIcon(validation.naver)}`}
                  value={settings.naverClientId}
                  onChange={(v) => setSettings((s) => ({ ...s, naverClientId: v }))}
                  placeholder="developers.naver.com에서 발급"
                  type="password"
                />
              </div>
              <div className={`rounded-lg ${statusClass(validation.naver)}`}>
                <Input
                  label={`Naver Client Secret${statusIcon(validation.naver)}`}
                  value={settings.naverClientSecret}
                  onChange={(v) => setSettings((s) => ({ ...s, naverClientSecret: v }))}
                  placeholder="Client Secret"
                  type="password"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} className="flex-1">
              {saved ? '저장 완료!' : '저장'}
            </Button>
            <Button variant="secondary" onClick={handleValidate} disabled={validating} className="flex-1">
              {validating ? '검증 중...' : 'API 키 검증'}
            </Button>
          </div>
        </div>
      </div>

      {/* 비밀번호 변경 섹션 */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-text-dark dark:text-white">관리자 비밀번호</h3>
        <div className="flex flex-col gap-4 rounded-xl border border-cream-dark bg-white p-6 dark:border-gray-600 dark:bg-gray-800">
          <Input
            label="새 비밀번호"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="새 비밀번호 입력"
            type="password"
          />
          <Button variant="secondary" onClick={handleChangePassword}>
            비밀번호 변경
          </Button>
        </div>
      </div>
    </div>
  )
}
