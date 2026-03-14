export default function LoadingSpinner({ text = '로딩 중...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-cream-dark border-t-blue-accent dark:border-gray-600 dark:border-t-blue-accent" />
      <span className="text-sm text-text-light dark:text-gray-400">{text}</span>
    </div>
  )
}
