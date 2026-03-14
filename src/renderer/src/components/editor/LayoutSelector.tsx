import { useCardStore } from '@/stores/useCardStore'
import { CARD_TEMPLATES } from '@/lib/cardTemplates'
import type { LayoutType } from '@/types'

const layouts = Object.values(CARD_TEMPLATES)

export default function LayoutSelector() {
  const { selectedLayout, setLayout } = useCardStore()

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-text-gray dark:text-gray-400">레이아웃</span>
      <div className="flex gap-2">
        {layouts.map((tmpl) => (
          <button
            key={tmpl.id}
            onClick={() => setLayout(tmpl.id as LayoutType)}
            className={`flex-1 rounded-lg border-2 px-3 py-3 text-center text-sm font-medium transition-all cursor-pointer ${
              selectedLayout === tmpl.id
                ? 'border-blue-accent bg-light-blue/30 text-blue-accent dark:bg-blue-accent/10'
                : 'border-cream-dark bg-white text-text-gray hover:border-blue-accent/40 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:border-blue-accent/40'
            }`}
          >
            <div className="font-semibold">{tmpl.name}</div>
            <div className="mt-1 text-xs opacity-70">{tmpl.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
