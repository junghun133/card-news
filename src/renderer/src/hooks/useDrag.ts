import { useRef, useState, useCallback, useEffect } from 'react'

const CARD_SIZE = 1080
const DEADZONE = 3

interface UseDragOptions {
  position: { x: number; y: number }
  scale: number
  onDragEnd: (pos: { x: number; y: number }) => void
}

export function useDrag({ position, scale, onDragEnd }: UseDragOptions) {
  const [localPos, setLocalPos] = useState(position)
  const [isDragging, setIsDragging] = useState(false)
  const latestPos = useRef(position)
  const onDragEndRef = useRef(onDragEnd)
  onDragEndRef.current = onDragEnd

  useEffect(() => {
    if (!isDragging) {
      setLocalPos(position)
      latestPos.current = position
    }
  }, [position.x, position.y, isDragging])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const startX = e.clientX
      const startY = e.clientY
      const initPos = { ...latestPos.current }
      let activated = false

      const onMouseMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY

        if (!activated) {
          if (Math.abs(dx) < DEADZONE && Math.abs(dy) < DEADZONE) return
          activated = true
          setIsDragging(true)
        }

        const pctX = (dx / scale / CARD_SIZE) * 100
        const pctY = (dy / scale / CARD_SIZE) * 100
        const newX = Math.max(0, Math.min(95, initPos.x + pctX))
        const newY = Math.max(0, Math.min(95, initPos.y + pctY))
        const newPos = { x: newX, y: newY }
        latestPos.current = newPos
        setLocalPos(newPos)
      }

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        if (activated) {
          onDragEndRef.current(latestPos.current)
        }
        setIsDragging(false)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [scale]
  )

  return { localPos, isDragging, handleMouseDown }
}
