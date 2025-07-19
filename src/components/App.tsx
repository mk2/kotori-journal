import React, { useState } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import { Config } from '../utils/config'
import { SearchView } from './SearchView'
import { CategoryManagerView } from './CategoryManager'
import { MenuView } from './MenuView'
import { JournalView } from './JournalView'
import { useJournalService } from '../hooks/useJournalService'
import { useJournalSubmit } from '../hooks/useJournalSubmit'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useLoadingAnimation } from '../hooks/useLoadingAnimation'

interface AppProps {
  config: Config
}

type AppMode = 'journal' | 'search' | 'category' | 'menu'

export const App: React.FC<AppProps> = ({ config }) => {
  const { exit } = useApp()
  const [mode, setMode] = useState<AppMode>('journal')
  const [selectedCategory, setSelectedCategory] = useState(config.defaultCategories[0])

  const {
    journalService,
    searchService,
    commandRegistry,
    entries,
    categories,
    isReady,
    setEntries,
    setCategories,
  } = useJournalService(config)
  const { input, setInput, message, isProcessingAI, handleSubmit } = useJournalSubmit({
    journalService,
    searchService,
    commandRegistry,
    selectedCategory,
    setEntries,
  })

  useAutoRefresh(journalService, setEntries)
  const loadingDots = useLoadingAnimation(isProcessingAI)

  useInput((inputChar: string, key: { ctrl?: boolean; tab?: boolean; escape?: boolean }) => {
    if (key.ctrl && (inputChar === 'c' || inputChar === 'd')) {
      exit()
      return
    }

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

  if (!isReady) {
    return (
      <Box>
        <Text>初期化中...</Text>
      </Box>
    )
  }

  if (mode === 'menu') {
    return (
      <MenuView
        onSelect={value => {
          if (value === 'exit') {
            exit()
          } else {
            setMode(value as AppMode)
          }
        }}
      />
    )
  }

  if (mode === 'search' && searchService) {
    return (
      <SearchView
        onSearch={keyword => searchService.searchByKeyword(keyword)}
        onClose={() => setMode('journal')}
      />
    )
  }

  if (mode === 'category' && journalService) {
    return (
      <CategoryManagerView
        categories={categories}
        onAddCategory={async name => {
          const result = await journalService.addCategory(name)
          if (result) {
            setCategories(journalService.getCategories())
          }
          return result
        }}
        onRemoveCategory={async name => {
          const result = await journalService.removeCategory(name)
          if (result) {
            setCategories(journalService.getCategories())
          }
          return result
        }}
        onClose={() => setMode('journal')}
      />
    )
  }

  return (
    <JournalView
      entries={entries}
      message={message}
      selectedCategory={selectedCategory}
      input={input}
      isProcessingAI={isProcessingAI}
      loadingDots={loadingDots}
      isAIAvailable={journalService?.isAIAvailable() || false}
      hasPlugins={!!commandRegistry}
      onInputChange={setInput}
      onSubmit={handleSubmit}
    />
  )
}
