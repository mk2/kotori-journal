import React from 'react'
import { Box, Text } from 'ink'
import { MultilineTextInput } from './MultilineTextInput'
import { JournalService } from '../services/journal-service'

interface JournalInputAreaProps {
  selectedCategory: string
  input: string
  onChange: (value: string) => void
  onSubmit: () => Promise<void>
  isProcessingAI: boolean
  journalService: JournalService | null
}

export const JournalInputArea: React.FC<JournalInputAreaProps> = ({
  selectedCategory,
  input,
  onChange,
  onSubmit,
  isProcessingAI,
  journalService,
}) => {
  const getPlaceholder = () => {
    if (isProcessingAI) return 'AI処理中...'
    if (journalService?.isAIAvailable()) {
      return '記録を入力... (/で始まるコマンド: /?, /summary, /advice, /help)'
    }
    return '記録を入力... (/で始まるコマンド利用可能)'
  }

  return (
    <Box flexShrink={0}>
      <Text color="blue">[{selectedCategory}] </Text>
      <MultilineTextInput
        value={input}
        onChange={onChange}
        onSubmit={isProcessingAI ? () => {} : onSubmit}
        placeholder={getPlaceholder()}
      />
    </Box>
  )
}
