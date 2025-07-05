import React, { useState, useCallback } from 'react'

export type AppMode = 'journal' | 'search' | 'category' | 'menu'

interface UseAppModeResult {
  mode: AppMode
  setMode: React.Dispatch<React.SetStateAction<AppMode>>
  switchToJournal: () => void
  switchToSearch: () => void
  switchToCategory: () => void
  switchToMenu: () => void
}

export const useAppMode = (initialMode: AppMode = 'journal'): UseAppModeResult => {
  const [mode, setMode] = useState<AppMode>(initialMode)

  const switchToJournal = useCallback(() => setMode('journal'), [])
  const switchToSearch = useCallback(() => setMode('search'), [])
  const switchToCategory = useCallback(() => setMode('category'), [])
  const switchToMenu = useCallback(() => setMode('menu'), [])

  return {
    mode,
    setMode,
    switchToJournal,
    switchToSearch,
    switchToCategory,
    switchToMenu,
  }
}
