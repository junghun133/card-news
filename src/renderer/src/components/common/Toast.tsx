import { useToastStore } from '@/stores/useToastStore'

const STYLES: Record<string, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-accent text-white'
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-lg animate-in ${STYLES[t.type]}`}
          style={{ animation: 'slideIn 0.3s ease-out' }}
        >
          <span className="flex-1">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="opacity-70 hover:opacity-100 cursor-pointer">
            x
          </button>
        </div>
      ))}
    </div>
  )
}
