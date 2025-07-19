import React from 'react'
import { Box, Text } from 'ink'
import { JournalEntry } from '../models/journal'

interface JournalHeaderProps {
  message: string
  todayEntries: JournalEntry[]
  isAIAvailable: boolean
  hasPlugins: boolean
}

export const JournalHeader: React.FC<JournalHeaderProps> = ({
  message,
  todayEntries,
  isAIAvailable,
  hasPlugins,
}) => {
  const journalCount = todayEntries.filter(e => !e.type || e.type === 'entry').length
  const aiConversationCount = todayEntries.filter(e => e.type === 'ai_question').length

  return (
    <Box flexDirection="column" flexShrink={0}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Kotori Journal
        </Text>
        <Text dimColor>
          {' '}
          - Enter で送信 | Ctrl+J で改行 | Tab でカテゴリ切替 | Esc でメニュー | Ctrl+F で検索 | /
          でコマンド | Ctrl+D で終了
        </Text>
        {isAIAvailable && <Text color="magenta"> | AI利用可能(/? 質問, /summary, /advice)</Text>}
        {hasPlugins && <Text color="cyan"> | プラグインシステム利用可能</Text>}
      </Box>

      {message && (
        <Box marginBottom={1}>
          <Text color="green">{message}</Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text>今日の記録: {journalCount}件</Text>
        {aiConversationCount > 0 && <Text color="magenta"> | AI会話: {aiConversationCount}回</Text>}
      </Box>
    </Box>
  )
}
