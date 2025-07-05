import React, { useState } from 'react'
import { Box, Text } from 'ink'
import { Config } from '../utils/config'
import { SearchView } from './SearchView'
import { CategoryManagerView } from './CategoryManager'
import { AppHeader } from './AppHeader'
import { JournalEntryList } from './JournalEntryList'
import { JournalInputArea } from './JournalInputArea'
import { MenuView } from './MenuView'
import { useJournalServices } from '../hooks/useJournalServices'
import { useJournalEntries } from '../hooks/useJournalEntries'
import { useAppMode } from '../hooks/useAppMode'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useCommandHandler } from '../hooks/useCommandHandler'

interface AppProps {
  config: Config
}

export const App: React.FC<AppProps> = ({ config }) => {
  const [selectedCategory, setSelectedCategory] = useState(config.defaultCategories[0])

  // カスタムフックを使用
  const { isReady, journalService, searchService, commandRegistry, categories, lastUpdateTime } =
    useJournalServices(config)

  const { entries, todayEntries, setEntries } = useJournalEntries(journalService, lastUpdateTime)

  const { mode, setMode } = useAppMode()

  const { input, setInput, message, isProcessingAI, loadingDots, handleSubmit } = useCommandHandler(
    {
      journalService,
      searchService,
      commandRegistry,
      selectedCategory,
      entries,
      setEntries,
    }
  )

  // キーボードショートカットを設定
  useKeyboardShortcuts({
    mode,
    input,
    categories,
    selectedCategory,
    setSelectedCategory,
    setMode,
  })

  // カテゴリ更新時の処理
  const updateCategories = () => {
    if (journalService) {
      const newCategories = journalService.getCategories()
      if (newCategories.length > 0 && !newCategories.includes(selectedCategory)) {
        setSelectedCategory(newCategories[0])
      }
    }
  }

  if (!isReady) {
    return (
      <Box>
        <Text>初期化中...</Text>
      </Box>
    )
  }

  // メニューモード
  if (mode === 'menu') {
    return <MenuView onSelect={setMode} />
  }

  // 検索モード
  if (mode === 'search' && searchService) {
    return (
      <SearchView
        onSearch={keyword => searchService.searchByKeyword(keyword)}
        onClose={() => setMode('journal')}
      />
    )
  }

  // カテゴリ管理モード
  if (mode === 'category' && journalService) {
    return (
      <CategoryManagerView
        categories={categories}
        onAddCategory={async name => {
          const result = await journalService.addCategory(name)
          if (result) updateCategories()
          return result
        }}
        onRemoveCategory={async name => {
          const result = await journalService.removeCategory(name)
          if (result) updateCategories()
          return result
        }}
        onClose={() => setMode('journal')}
      />
    )
  }

  // ジャーナルモード（デフォルト）
  return (
    <Box flexDirection="column" height="100%">
      {/* ヘッダー部分 */}
      <AppHeader
        message={message}
        todayEntries={todayEntries}
        journalService={journalService}
        commandRegistry={commandRegistry}
      />

      {/* エントリー表示部分 */}
      <JournalEntryList
        todayEntries={todayEntries}
        isProcessingAI={isProcessingAI}
        loadingDots={loadingDots}
      />

      {/* 区切り線 */}
      <Box flexShrink={0}>
        <Text color="gray">{'─'.repeat(50)}</Text>
      </Box>

      {/* 入力欄 */}
      <JournalInputArea
        selectedCategory={selectedCategory}
        input={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isProcessingAI={isProcessingAI}
        journalService={journalService}
      />
    </Box>
  )
}
