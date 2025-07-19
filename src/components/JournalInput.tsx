import React from 'react'
import { Box, Text } from 'ink'
import { MultilineTextInput } from './MultilineTextInput'

interface JournalInputProps {
  selectedCategory: string
  input: string
  onInputChange: (value: string) => void
  onSubmit: () => void
  isProcessingAI: boolean
  isAIAvailable: boolean
}

export const JournalInput: React.FC<JournalInputProps> = ({
  selectedCategory,
  input,
  onInputChange,
  onSubmit,
  isProcessingAI,
  isAIAvailable,
}) => {
  return (
    <Box flexShrink={0}>
      <Text color="blue">[{selectedCategory}] </Text>
      <MultilineTextInput
        value={input}
        onChange={onInputChange}
        onSubmit={isProcessingAI ? () => {} : onSubmit}
        placeholder={
          isProcessingAI
            ? 'AI処理中...'
            : isAIAvailable
              ? '記録を入力... (/で始まるコマンド: /?, /summary, /advice, /help)'
              : '記録を入力... (/で始まるコマンド利用可能)'
        }
      />
    </Box>
  )
}
