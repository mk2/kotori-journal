import React, { useState, useCallback, useEffect } from 'react'
import { JournalService } from '../services/journal-service'
import { SearchService } from '../services/search-service'
import { CommandRegistry } from '../services/command-registry'
import { JournalEntry } from '../models/journal'

interface UseCommandHandlerProps {
  journalService: JournalService | null
  searchService: SearchService | null
  commandRegistry: CommandRegistry | null
  selectedCategory: string
  entries: JournalEntry[]
  setEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>
}

interface UseCommandHandlerResult {
  input: string
  setInput: (value: string) => void
  message: string
  isProcessingAI: boolean
  loadingDots: string
  handleSubmit: () => Promise<void>
}

export const useCommandHandler = ({
  journalService,
  searchService,
  commandRegistry,
  selectedCategory,
  entries,
  setEntries,
}: UseCommandHandlerProps): UseCommandHandlerResult => {
  const [input, setInput] = useState('')
  const [message, setMessage] = useState('')
  const [isProcessingAI, setIsProcessingAI] = useState(false)
  const [loadingDots, setLoadingDots] = useState('')

  // ローディングアニメーション用のuseEffect
  useEffect(() => {
    if (!isProcessingAI) {
      setLoadingDots('')
      return
    }

    const interval = globalThis.setInterval(() => {
      setLoadingDots(prev => {
        if (prev.length >= 3) return ''
        return prev + '.'
      })
    }, 500)

    return () => globalThis.clearInterval(interval)
  }, [isProcessingAI])

  const handleSubmit = useCallback(async () => {
    if (!journalService || !commandRegistry || !input.trim()) return

    const inputText = input.trim()

    try {
      // コマンドかどうかをチェック
      const command = commandRegistry.findCommand(inputText)

      if (command) {
        // コマンド実行
        setInput('')
        setIsProcessingAI(true)
        setMessage('')

        try {
          const context = {
            input: inputText,
            entries: journalService.getEntries(),
            services: {
              journal: journalService,
              storage: (journalService as unknown as { storage: unknown })['storage'], // private fieldへのアクセス（型エラー回避のため）
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
        // 従来のAIトリガー処理（下位互換性のため）
        if (!journalService.isAIAvailable()) {
          setMessage('AI機能が利用できません。ANTHROPIC_API_KEYを設定してください。')
          setTimeout(() => setMessage(''), 3000)
          return
        }

        // ユーザーの質問を即座に表示
        const questionEntry = await journalService.addEntry(inputText, 'AI', 'ai_question')
        setEntries(prevEntries => [...prevEntries, questionEntry])
        setInput('')

        // AI処理開始
        setIsProcessingAI(true)
        setMessage('')

        try {
          // 今日のジャーナルエントリーのみを取得（AI会話は除く）
          const today = new Date()
          const todayJournalEntries = journalService.getJournalEntriesByDate(today)

          // AI応答を取得
          const response = await journalService.generateAIResponse(inputText, todayJournalEntries)

          // AI応答を履歴に追加
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
        // 通常のジャーナルエントリー追加
        const entry = await journalService.addEntry(inputText, selectedCategory)
        setEntries([...entries, entry])
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
  }, [journalService, commandRegistry, searchService, input, selectedCategory, entries, setEntries])

  return {
    input,
    setInput,
    message,
    isProcessingAI,
    loadingDots,
    handleSubmit,
  }
}
