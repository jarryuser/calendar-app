import { useRef } from 'react'

const THRESHOLD = 50
const MAX_VERTICAL_DRIFT = 80

export function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const startX = useRef(0)
  const startY = useRef(0)

  return {
    onTouchStart: (e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX
      startY.current = e.touches[0].clientY
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX.current
      const dy = Math.abs(e.changedTouches[0].clientY - startY.current)
      if (dy > MAX_VERTICAL_DRIFT) return // mostly vertical scroll, ignore
      if (dx < -THRESHOLD) onSwipeLeft()
      else if (dx > THRESHOLD) onSwipeRight()
    },
  }
}
