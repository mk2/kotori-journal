import React, { useState } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import TextInput from 'ink-text-input'
import { JournalEntry } from '../models/journal'
import { SearchResults } from '../services/search-service'

interface SearchViewProps {
  onSearch: (keyword: string) => Promise<SearchResults>
  onClose: () => void
}

export const SearchView: React.FC<SearchViewProps> = ({ onSearch, onClose }) => {
  const { exit } = useApp()
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  useInput((inputChar: string, key: { ctrl?: boolean; escape?: boolean }) => {
    if (key.ctrl && (inputChar === 'c' || inputChar === 'd')) {
      exit()
      return
    }
    if (key.escape) {
      onClose()
      return
    }
  })

  const handleSearch = async () => {
    if (!searchTerm.trim()) return

    setIsSearching(true)
    try {
      const searchResults = await onSearch(searchTerm)
      setResults(searchResults)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const formatEntry = (entry: JournalEntry) => {
    const date = new Date(entry.timestamp)
    const time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    return `[${time}] [${entry.category}] ${entry.content}`
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          検索モード
        </Text>
        <Text dimColor> - Enter で検索 | Esc で戻る | Ctrl+D で終了</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>検索: </Text>
        <TextInput
          value={searchTerm}
          onChange={setSearchTerm}
          onSubmit={handleSearch}
          placeholder="キーワードを入力..."
        />
      </Box>

      {isSearching && (
        <Box>
          <Text color="yellow">検索中...</Text>
        </Box>
      )}

      {results && !isSearching && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold>検索結果: {results.currentEntries.length + results.reports.length}件</Text>
          </Box>

          {results.currentEntries.length > 0 && (
            <Box flexDirection="column" marginBottom={1}>
              <Text bold color="green">
                現在のエントリー:
              </Text>
              {results.currentEntries.map(entry => (
                <Text key={entry.id}>{formatEntry(entry)}</Text>
              ))}
            </Box>
          )}

          {results.reports.length > 0 && (
            <Box flexDirection="column">
              <Text bold color="green">
                過去の日報:
              </Text>
              {results.reports.map((report, index) => (
                <Box key={index} flexDirection="column" marginBottom={1}>
                  <Text color="blue">{report.date}:</Text>
                  {report.matches.slice(0, 3).map((match, i) => (
                    <Text key={i} dimColor>
                      {' '}
                      {match}
                    </Text>
                  ))}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}
