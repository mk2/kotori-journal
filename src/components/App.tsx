import React, { useState, useEffect } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import TextInput from 'ink-text-input'
import SelectInput from 'ink-select-input'
import { JournalService } from '../services/journal-service'
import { SearchService } from '../services/search-service'
import { Config } from '../utils/config'
import { JournalEntry } from '../models/journal'
import { SearchView } from './SearchView'
import { CategoryManagerView } from './CategoryManager'

interface AppProps {
  config: Config
}

type AppMode = 'journal' | 'search' | 'category' | 'menu'

export const App: React.FC<AppProps> = ({ config }) => {
  const { exit } = useApp()
  const [input, setInput] = useState('')
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [message, setMessage] = useState('')
  const [isReady, setIsReady] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(config.defaultCategories[0])
  const [journalService, setJournalService] = useState<JournalService | null>(null)
  const [searchService, setSearchService] = useState<SearchService | null>(null)
  const [mode, setMode] = useState<AppMode>('journal')
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    const initService = async () => {
      const service = new JournalService(config.dataPath)
      await service.initialize()
      setJournalService(service)
      setSearchService(new SearchService(service))
      setEntries(service.getEntries())
      setCategories(service.getCategories())
      setIsReady(true)
    }
    
    initService().catch(console.error)
  }, [config.dataPath])

  useInput((input: string, key: any) => {
    if (key.ctrl && input === 'c') {
      exit()
    }
    
    if (mode === 'journal') {
      if (key.return && key.meta && journalService) {
        if (input.trim()) {
          handleSubmit()
        }
      }
      
      if (key.tab && mode === 'journal') {
        const currentIndex = categories.indexOf(selectedCategory)
        const nextIndex = (currentIndex + 1) % categories.length
        setSelectedCategory(categories[nextIndex])
      }
      
      if (key.escape) {
        setMode('menu')
      }
      
      if (input === '/' && mode === 'journal') {
        setMode('search')
      }
    } else if (mode === 'menu' || mode === 'search' || mode === 'category') {
      if (key.escape) {
        setMode('journal')
      }
    }
  })

  const handleSubmit = async () => {
    if (!journalService || !input.trim()) return
    
    try {
      const entry = await journalService.addEntry(input.trim(), selectedCategory)
      setEntries([...entries, entry])
      setInput('')
      setMessage('エントリーを保存しました')
      
      setTimeout(() => setMessage(''), 2000)
    } catch (error) {
      setMessage('保存に失敗しました')
      console.error(error)
    }
  }

  if (!isReady) {
    return (
      <Box>
        <Text>初期化中...</Text>
      </Box>
    )
  }

  const todayEntries = entries.filter(entry => {
    const today = new Date()
    const entryDate = new Date(entry.timestamp)
    return (
      entryDate.getDate() === today.getDate() &&
      entryDate.getMonth() === today.getMonth() &&
      entryDate.getFullYear() === today.getFullYear()
    )
  })

  const menuItems = [
    { label: 'ジャーナル入力に戻る', value: 'journal' },
    { label: '検索 (/)', value: 'search' },
    { label: 'カテゴリ管理', value: 'category' },
    { label: '終了 (Ctrl+C)', value: 'exit' }
  ]

  if (mode === 'menu') {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">メニュー</Text>
        </Box>
        <SelectInput
          items={menuItems}
          onSelect={(item) => {
            if (item.value === 'exit') {
              exit()
            } else {
              setMode(item.value as AppMode)
            }
          }}
        />
      </Box>
    )
  }

  if (mode === 'search' && searchService) {
    return (
      <SearchView
        onSearch={(keyword) => searchService.searchByKeyword(keyword)}
        onClose={() => setMode('journal')}
      />
    )
  }

  if (mode === 'category' && journalService) {
    return (
      <CategoryManagerView
        categories={categories}
        onAddCategory={async (name) => {
          const result = await journalService.addCategory(name)
          if (result) {
            setCategories(journalService.getCategories())
          }
          return result
        }}
        onRemoveCategory={async (name) => {
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
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Kotori Journal
        </Text>
        <Text dimColor> - Cmd+Enter で送信 | Tab でカテゴリ切替 | Esc でメニュー | / で検索</Text>
      </Box>

      {message && (
        <Box marginBottom={1}>
          <Text color="green">{message}</Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text>今日の記録: {todayEntries.length}件</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {todayEntries.slice(-5).map((entry, index) => (
          <Box key={entry.id}>
            <Text color="yellow">[{entry.category}]</Text>
            <Text> {entry.content}</Text>
          </Box>
        ))}
      </Box>

      <Box>
        <Text color="blue">[{selectedCategory}] </Text>
        <TextInput
          value={input}
          onChange={setInput}
          placeholder="記録を入力..."
        />
      </Box>
    </Box>
  )
}