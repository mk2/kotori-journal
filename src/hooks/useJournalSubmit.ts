import React, { useState } from 'react'
import { JournalService } from '../services/journal-service'
import { SearchService } from '../services/search-service'
import { CommandRegistry } from '../services/command-registry'
import { JournalEntry } from '../models/journal'

interface UseJournalSubmitParams {
  journalService: JournalService | null
  searchService: SearchService | null
  commandRegistry: CommandRegistry | null
  selectedCategory: string
  setEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>
}

export const useJournalSubmit = ({
  journalService,
  searchService,
  commandRegistry,
  selectedCategory,
  setEntries,
}: UseJournalSubmitParams) => {
  const [input, setInput] = useState('')
  const [message, setMessage] = useState('')
  const [isProcessingAI, setIsProcessingAI] = useState(false)

  const handleSubmit = async () => {
    if (!journalService || !commandRegistry || !input.trim()) return

    const inputText = input.trim()

    try {
      const command = commandRegistry.findCommand(inputText)

      if (command) {
        setInput('')
        setIsProcessingAI(true)
        setMessage('')

        try {
          const context = {
            input: inputText,
            entries: journalService.getEntries(),
            services: {
              journal: journalService,
              storage: journalService['storage'],
              search: searchService!,
            },
            ui: {
              setMessage,
              setEntries,
              addEntry: (entry: JournalEntry) => setEntries(prev => [...prev, entry]),
            },
          }

          const result = await commandRegistry.executeCommand(command, context)

          if (result.type === 'error') {
            setMessage(result.content)
            setTimeout(() => setMessage(''), 3000)
          } else if (result.type === 'display') {
            setMessage(result.content)
            setTimeout(() => setMessage(''), 5000)
          } else {
            setMessage(result.content)
            setTimeout(() => setMessage(''), 2000)
          }
        } catch (commandError) {
          setMessage('コマンドの実行に失敗しました')
          // eslint-disable-next-line no-console
          console.error('Command execution error:', commandError)
          setTimeout(() => setMessage(''), 3000)
        } finally {
          setIsProcessingAI(false)
        }
      } else if (journalService.isAITrigger(inputText)) {
        if (!journalService.isAIAvailable()) {
          setMessage('AI機能が利用できません。ANTHROPIC_API_KEYを設定してください。')
          setTimeout(() => setMessage(''), 3000)
          return
        }

        const questionEntry = await journalService.addEntry(inputText, 'AI', 'ai_question')
        setEntries(prevEntries => [...prevEntries, questionEntry])
        setInput('')

        setIsProcessingAI(true)
        setMessage('')

        try {
          const today = new Date()
          const todayJournalEntries = journalService.getJournalEntriesByDate(today)
          const response = await journalService.generateAIResponse(inputText, todayJournalEntries)
          const responseEntry = await journalService.addEntry(response, 'AI', 'ai_response')
          setEntries(prevEntries => [...prevEntries, responseEntry])
        } catch (aiError) {
          setMessage('AI処理でエラーが発生しました')
          // eslint-disable-next-line no-console
          console.error('AI processing error:', aiError)
          setTimeout(() => setMessage(''), 3000)
        } finally {
          setIsProcessingAI(false)
        }
      } else {
        const entry = await journalService.addEntry(inputText, selectedCategory)
        setEntries(prev => [...prev, entry])
        setInput('')
        setMessage('エントリーを保存しました')
        setTimeout(() => setMessage(''), 2000)
      }
    } catch (error) {
      setMessage('保存に失敗しました')
      // eslint-disable-next-line no-console
      console.error('Failed to save entry:', error)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  return {
    input,
    setInput,
    message,
    isProcessingAI,
    handleSubmit,
  }
}
