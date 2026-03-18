import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react'

interface FloatingWindowProps {
  title: string
  isOpen: boolean
  isMinimized: boolean
  position: { x: number; y: number }
  onClose: () => void
  onToggleMinimize: () => void
  onPositionChange: (pos: { x: number; y: number }) => void
  children: ReactNode
  statusText?: string
}

export default function FloatingWindow({
  title,
  isOpen,
  isMinimized,
  position,
  onClose,
  onToggleMinimize,
  onPositionChange,
  children,
  statusText
}: FloatingWindowProps) {
  const [isDragging, setIsDragging] = useState(false)
  const windowRef = useRef<HTMLDivElement>(null)
  const [initialized, setInitialized] = useState(false)

  // 초기 위치를 화면 중앙으로 설정
  useEffect(() => {
    if (isOpen && !initialized && position.x === -1 && position.y === -1) {
      const x = Math.max(0, (window.innerWidth - 500) / 2)
      const y = Math.max(0, (window.innerHeight - 600) / 2)
      onPositionChange({ x, y })
      setInitialized(true)
    }
  }, [isOpen, initialized, position, onPositionChange])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startY = e.clientY
      const initPos = { ...position }

      const onMouseMove = (ev: MouseEvent) => {
        setIsDragging(true)
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        const newX = Math.max(0, Math.min(window.innerWidth - 100, initPos.x + dx))
        const newY = Math.max(0, Math.min(window.innerHeight - 40, initPos.y + dy))
        onPositionChange({ x: newX, y: newY })
      }

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        setIsDragging(false)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [position, onPositionChange]
  )

  if (!isOpen) return null

  const posX = position.x === -1 ? (window.innerWidth - 500) / 2 : position.x
  const posY = position.y === -1 ? (window.innerHeight - 600) / 2 : position.y

  // 최소화 상태: 우하단 작은 바
  if (isMinimized) {
    return (
      <div
        className="fixed z-40 flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-2xl border border-cream-dark dark:bg-gray-800 dark:border-gray-600"
        style={{ right: 24, bottom: 24 }}
      >
        <span className="text-sm font-bold text-text-dark dark:text-white">🎬 {title}</span>
        {statusText && (
          <span className="text-xs text-blue-accent font-medium">{statusText}</span>
        )}
        <button
          onClick={onToggleMinimize}
          className="rounded-md px-2 py-1 text-xs font-medium text-blue-accent hover:bg-blue-accent/10 cursor-pointer"
        >
          ↗ 열기
        </button>
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-xs text-text-light hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 cursor-pointer"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div
      ref={windowRef}
      className="fixed z-40 flex flex-col rounded-2xl bg-white shadow-2xl border border-cream-dark dark:bg-gray-800 dark:border-gray-600"
      style={{
        left: posX,
        top: posY,
        width: 500,
        maxHeight: '85vh'
      }}
    >
      {/* 타이틀바 */}
      <div
        onMouseDown={handleMouseDown}
        className={`flex items-center justify-between rounded-t-2xl border-b border-cream-dark px-4 py-3 dark:border-gray-600 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } select-none bg-cream/50 dark:bg-gray-700/50`}
      >
        <span className="text-sm font-bold text-text-dark dark:text-white">🎬 {title}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleMinimize}
            className="rounded-md px-2 py-1 text-xs text-text-gray hover:bg-cream-dark dark:text-gray-400 dark:hover:bg-gray-600 cursor-pointer"
            title="최소화"
          >
            ─
          </button>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-text-gray hover:bg-red-50 hover:text-red-500 dark:text-gray-400 dark:hover:bg-red-500/10 cursor-pointer"
            title="닫기"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-6">
        {children}
      </div>
    </div>
  )
}
