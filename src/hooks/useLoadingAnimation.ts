import { useState, useEffect } from 'react'

export const useLoadingAnimation = (isLoading: boolean) => {
  const [loadingDots, setLoadingDots] = useState('')

  useEffect(() => {
    if (!isLoading) {
      setLoadingDots('')
      return
    }

    const interval = globalThis.setInterval(() => {
      setLoadingDots(prev => {
        if (prev.length >= 3) return ''
        return prev + '.'
      })
    }, 500)

    return () => globalThis.clearInterval(interval)
  }, [isLoading])

  return loadingDots
}
