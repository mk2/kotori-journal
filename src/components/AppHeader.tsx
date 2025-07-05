import React from 'react'
import { Box, Text } from 'ink'
import { JournalEntry } from '../models/journal'
import { JournalService } from '../services/journal-service'
import { CommandRegistry } from '../services/command-registry'

interface AppHeaderProps {
  message: string
  todayEntries: JournalEntry[]
  journalService: JournalService | null
  commandRegistry: CommandRegistry | null
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  message,
  todayEntries,
  journalService,
  commandRegistry,
}) => {
  const journalEntriesCount = todayEntries.filter(e => !e.type || e.type === 'entry').length
  const aiQuestionsCount = todayEntries.filter(e => e.type === 'ai_question').length

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
        {journalService?.isAIAvailable() && (
          <Text color="magenta"> | AI利用可能(/? 質問, /summary, /advice)</Text>
        )}
        {commandRegistry && <Text color="cyan"> | プラグインシステム利用可能</Text>}
      </Box>

      {message && (
        <Box marginBottom={1}>
          <Text color="green">{message}</Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text>今日の記録: {journalEntriesCount}件</Text>
        {aiQuestionsCount > 0 && <Text color="magenta"> | AI会話: {aiQuestionsCount}回</Text>}
      </Box>
    </Box>
  )
}
