import React from 'react'
import { Box, Text } from 'ink'
import { JournalEntry } from '../models/journal'

interface JournalEntriesProps {
  entries: JournalEntry[]
  isProcessingAI: boolean
  loadingDots: string
}

export const JournalEntries: React.FC<JournalEntriesProps> = ({
  entries,
  isProcessingAI,
  loadingDots,
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
    <Box flexDirection="column" flexGrow={1}>
      {todayEntries.length === 0 && !isProcessingAI ? (
        <Box>
          <Text dimColor>まだ記録がありません。下の入力欄から記録を追加してください。</Text>
        </Box>
      ) : (
        <>
          {todayEntries.slice(-10).map(entry => {
            const time = new Date(entry.timestamp).toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
            })

            if (entry.type === 'ai_question') {
              return (
                <Box key={entry.id} marginBottom={1}>
                  <Text color="cyan">{time}</Text>
                  <Text color="magenta"> [AI質問]</Text>
                  <Text> {entry.content}</Text>
                </Box>
              )
            }

            if (entry.type === 'ai_response') {
              return (
                <Box key={entry.id} marginBottom={1} paddingLeft={2}>
                  <Text color="cyan">{time}</Text>
                  <Text color="magenta"> [AI応答]</Text>
                  <Text color="gray"> {entry.content}</Text>
                </Box>
              )
            }

            return (
              <Box key={entry.id} marginBottom={1}>
                <Text color="cyan">{time}</Text>
                <Text color="yellow"> [{entry.category}]</Text>
                <Text> {entry.content}</Text>
              </Box>
            )
          })}

          {isProcessingAI && (
            <Box marginBottom={1} paddingLeft={2}>
              <Text color="cyan">
                {new Date().toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text color="magenta"> [AI応答]</Text>
              <Text color="gray"> 思考中{loadingDots}</Text>
            </Box>
          )}
        </>
      )}
    </Box>
  )
}
