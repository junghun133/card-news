import { useState, useEffect } from 'react'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    serperApiKey: '',
    openaiApiKey: '',
    unsplashAccessKey: ''
  })
  const [saved, setSaved] = useState(false)

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
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-6 text-2xl font-bold text-text-dark">API 설정</h2>
      <p className="mb-6 text-sm text-text-light">
        뉴스 검색, AI 요약, 배경 이미지 기능을 사용하려면 API 키를 입력해주세요.
      </p>

      <div className="flex flex-col gap-5 rounded-xl border border-cream-dark bg-white p-6">
        <Input
          label="Serper API Key (뉴스 검색)"
          value={settings.serperApiKey}
          onChange={(v) => setSettings((s) => ({ ...s, serperApiKey: v }))}
          placeholder="serper.dev에서 발급"
          type="password"
        />
        <Input
          label="OpenAI API Key (AI 요약/교차검증)"
          value={settings.openaiApiKey}
          onChange={(v) => setSettings((s) => ({ ...s, openaiApiKey: v }))}
          placeholder="sk-..."
          type="password"
        />
        <Input
          label="Unsplash Access Key (배경 이미지)"
          value={settings.unsplashAccessKey}
          onChange={(v) => setSettings((s) => ({ ...s, unsplashAccessKey: v }))}
          placeholder="unsplash.com에서 발급"
          type="password"
        />
        <Button onClick={handleSave}>{saved ? '저장 완료!' : '저장'}</Button>
      </div>
    </div>
  )
}
