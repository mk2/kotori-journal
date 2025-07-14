import { useInput, useApp } from 'ink'
import { AppMode } from './useAppMode'

interface UseKeyboardShortcutsProps {
  mode: AppMode
  input: string
  categories: string[]
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  setMode: (mode: AppMode) => void
}

export const useKeyboardShortcuts = ({
  mode,
  input,
  categories,
  selectedCategory,
  setSelectedCategory,
  setMode,
}: UseKeyboardShortcutsProps): void => {
  const { exit } = useApp()

  useInput((inputChar: string, key: { ctrl?: boolean; tab?: boolean; escape?: boolean }) => {
    // 終了キー: Ctrl+C または Ctrl+D（全モードで有効）
    if (key.ctrl && (inputChar === 'c' || inputChar === 'd')) {
      exit()
      return
    }

    // journalモード以外では処理しない
    if (mode !== 'journal') return

    if (key.tab && categories.length > 0) {
      const currentIndex = categories.indexOf(selectedCategory)
      const nextIndex = (currentIndex + 1) % categories.length
      setSelectedCategory(categories[nextIndex])
      return
    }

    if (key.escape) {
      setMode('menu')
      return
    }

    if (key.ctrl && inputChar === 'f' && !input) {
      setMode('search')
      return
    }
  })
}
