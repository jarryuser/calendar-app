import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'

export function useTheme() {
  const isDark = useUIStore(s => s.isDarkTheme)
  const designTheme = useUIStore(s => s.designTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    document.documentElement.dataset.design = designTheme
  }, [designTheme])
}
