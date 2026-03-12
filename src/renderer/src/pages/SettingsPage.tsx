import { useState, useEffect } from 'react'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'

interface ValidationResult {
  serper: boolean | null
  openai: boolean | null
  unsplash: boolean | null
}

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    serperApiKey: '',
    openaiApiKey: '',
    unsplashAccessKey: ''
  })
  const [saved, setSaved] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState<ValidationResult>({
    serper: null,
    openai: null,
    unsplash: null
  })
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    if (window.api) {
      window.api.getSettings().then(setSettings)
    }
  }, [])

  const handleSave = async () => {
    if (window.api) {
      await window.api.setSettings(settings)
    }
    setSaved(true)
    addToast('success', 'API 키가 저장되었습니다.')
    setTimeout(() => setSaved(false), 2000)
  }

  const handleValidate = async () => {
    setValidating(true)
    // 먼저 저장
    if (window.api) {
      await window.api.setSettings(settings)
    }

    const result: ValidationResult = { serper: null, openai: null, unsplash: null }

    // 각 키 검증
    if (window.api) {
      try {
        const r = await window.api.validateSettings()
        result.serper = r.serper
        result.openai = r.openai
        result.unsplash = r.unsplash
      } catch {
        addToast('error', '검증 중 오류가 발생했습니다.')
      }
    }

    setValidation(result)
    setValidating(false)

    const ok = [result.serper, result.openai, result.unsplash].filter(Boolean).length
    const total = [result.serper, result.openai, result.unsplash].filter((v) => v !== null).length
    if (ok === total && total > 0) {
      addToast('success', '모든 API 키가 유효합니다!')
    } else {
      addToast('error', `${total}개 중 ${ok}개 키가 유효합니다.`)
    }
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
    <div className="mx-auto max-w-lg">
      <h2 className="mb-6 text-2xl font-bold text-text-dark dark:text-white">API 설정</h2>
      <p className="mb-6 text-sm text-text-light">
        뉴스 검색, AI 요약, 배경 이미지 기능을 사용하려면 API 키를 입력해주세요.
      </p>

      <div className="flex flex-col gap-5 rounded-xl border border-cream-dark bg-white p-6 dark:border-gray-600 dark:bg-gray-800">
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
        <div className={`rounded-lg ${statusClass(validation.unsplash)}`}>
          <Input
            label={`Unsplash Access Key (배경 이미지)${statusIcon(validation.unsplash)}`}
            value={settings.unsplashAccessKey}
            onChange={(v) => setSettings((s) => ({ ...s, unsplashAccessKey: v }))}
            placeholder="unsplash.com에서 발급"
            type="password"
          />
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
  )
}
