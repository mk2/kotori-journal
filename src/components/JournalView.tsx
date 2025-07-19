import React from 'react'
import { Box, Text } from 'ink'
import { JournalEntry } from '../models/journal'
import { JournalHeader } from './JournalHeader'
import { JournalEntries } from './JournalEntries'
import { JournalInput } from './JournalInput'

interface JournalViewProps {
  entries: JournalEntry[]
  message: string
  selectedCategory: string
  input: string
  isProcessingAI: boolean
  loadingDots: string
  isAIAvailable: boolean
  hasPlugins: boolean
  onInputChange: (value: string) => void
  onSubmit: () => void
}

export const JournalView: React.FC<JournalViewProps> = ({
  entries,
  message,
  selectedCategory,
  input,
  isProcessingAI,
  loadingDots,
  isAIAvailable,
  hasPlugins,
  onInputChange,
  onSubmit,
}) => {
  const todayEntries = entries.filter(entry => {
    const today = new Date()
    const entryDate = new Date(entry.timestamp)
    return (
      entryDate.getDate() === today.getDate() &&
      entryDate.getMonth() === today.getMonth() &&
      entryDate.getFullYear() === today.getFullYear()
    )
  })

  return (
    <Box flexDirection="column" height="100%">
      <JournalHeader
        message={message}
        todayEntries={todayEntries}
        isAIAvailable={isAIAvailable}
        hasPlugins={hasPlugins}
      />

      <JournalEntries entries={entries} isProcessingAI={isProcessingAI} loadingDots={loadingDots} />

      <Box flexShrink={0}>
        <Text color="gray">{'─'.repeat(50)}</Text>
      </Box>

      <JournalInput
        selectedCategory={selectedCategory}
        input={input}
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        isProcessingAI={isProcessingAI}
        isAIAvailable={isAIAvailable}
      />
    </Box>
  )
}
