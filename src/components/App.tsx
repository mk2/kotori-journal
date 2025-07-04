import React, { useState, useEffect, useRef } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import SelectInput from 'ink-select-input'
import { JournalService } from '../services/journal-service'
import { SearchService } from '../services/search-service'
import { CommandRegistry } from '../services/command-registry'
import { PluginManager } from '../services/plugin-manager'
import {
  QuestionCommand,
  SummaryCommand,
  AdviceCommand,
  HelpCommand,
} from '../commands/ai-commands'
import { Config } from '../utils/config'
import { JournalEntry } from '../models/journal'
import { SearchView } from './SearchView'
import { CategoryManagerView } from './CategoryManager'
import { MultilineTextInput } from './MultilineTextInput'
import { generateHeaderText, getTerminalWidth, combineHeaderText } from '../utils/responsive-header'
import { generateTerminalSeparator } from '../utils/responsive-separator'

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
  const [commandRegistry, setCommandRegistry] = useState<CommandRegistry | null>(null)
  const [, setPluginManager] = useState<PluginManager | null>(null)
  const [mode, setMode] = useState<AppMode>('journal')
  const [categories, setCategories] = useState<string[]>([])
  const [isProcessingAI, setIsProcessingAI] = useState(false)
  const [loadingDots, setLoadingDots] = useState('')
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)
  const scrollPositionRef = useRef<number>(0)

  // スクロール位置を保存する関数
  const saveScrollPosition = () => {
    if (process.stdout.isTTY) {
      scrollPositionRef.current = process.stdout.rows || 0
    }
  }

  // スクロール位置を復元する関数
  const restoreScrollPosition = () => {
    if (process.stdout.isTTY && scrollPositionRef.current > 0) {
      // 簡単な実装: 画面をクリアせずに同じ位置に保つ
      // より高度な実装が必要な場合は、外部ライブラリを検討
    }
  }

  // 1秒ごとにデータ変更をチェックし、変更があった場合のみ更新するuseEffect
  useEffect(() => {
    if (!journalService) return

    const interval = globalThis.setInterval(async () => {
      try {
        // 最後の更新時刻を取得
        const currentUpdateTime = await journalService.getLastUpdateTime()

        // 前回の更新時刻と比較して変更があった場合のみ更新
        if (currentUpdateTime > lastUpdateTime) {
          // スクロール位置を保存
          saveScrollPosition()

          const latestEntries = await journalService.refreshEntries()
          setEntries(latestEntries)
          setLastUpdateTime(currentUpdateTime)

          // 次のレンダリング後にスクロール位置を復元
          setTimeout(restoreScrollPosition, 0)
        }
      } catch (error) {
        // エラーが発生した場合は現在のエントリーを保持
        // eslint-disable-next-line no-console
        console.error('Failed to refresh entries:', error)
      }
    }, 1000)

    return () => globalThis.clearInterval(interval)
  }, [journalService, lastUpdateTime])

  useEffect(() => {
    const initService = async () => {
      const service = new JournalService(config.dataPath)
      await service.initialize()

      const registry = new CommandRegistry()
      const manager = new PluginManager(config.dataPath, config, registry)

      // 標準AIコマンドを登録
      registry.register(new QuestionCommand())
      registry.register(new SummaryCommand())
      registry.register(new AdviceCommand())
      registry.register(new HelpCommand())

      // プラグインマネージャーを初期化
      await manager.initialize()

      setJournalService(service)
      setSearchService(new SearchService(service))
      setCommandRegistry(registry)
      setPluginManager(manager)
      setEntries(service.getEntries())
      setCategories(service.getCategories())

      // 初期の最終更新時刻を設定
      const initialUpdateTime = await service.getLastUpdateTime()
      setLastUpdateTime(initialUpdateTime)

      setIsReady(true)
    }

    initService().catch(error => {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize service:', error)
    })
  }, [config])

  useInput((inputChar: string, key: { ctrl?: boolean; tab?: boolean; escape?: boolean }) => {
    // 終了キー: Ctrl+C または Ctrl+D（全モードで有効）
    if (key.ctrl && (inputChar === 'c' || inputChar === 'd')) {
      exit()
      return
    }

    // journalモード以外では処理しない
    if (mode !== 'journal') return

    if (key.tab && categories.length > 0) {
      const currentIndex = categories.indexOf(selectedCategory)
      const nextIndex = (currentIndex + 1) % categories.length
      setSelectedCategory(categories[nextIndex])
      return
    }

    if (key.escape) {
      setMode('menu')
      return
    }

    if (key.ctrl && inputChar === 'f' && !input) {
      setMode('search')
      return
    }
  })

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

  const handleSubmit = async () => {
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
              storage: journalService['storage'], // private fieldへのアクセス（型エラー回避のため）
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
    { label: '検索 (Ctrl+F)', value: 'search' },
    { label: 'カテゴリ管理', value: 'category' },
    { label: '終了 (Ctrl+D)', value: 'exit' },
  ]

  if (mode === 'menu') {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">
            メニュー
          </Text>
        </Box>
        <SelectInput
          items={menuItems}
          onSelect={item => {
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
        onSearch={keyword => searchService.searchByKeyword(keyword)}
        onClose={() => setMode('journal')}
      />
    )
  }

  if (mode === 'category' && journalService) {
    return (
      <CategoryManagerView
        categories={categories}
        onAddCategory={async name => {
          const result = await journalService.addCategory(name)
          if (result) {
            setCategories(journalService.getCategories())
          }
          return result
        }}
        onRemoveCategory={async name => {
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

  // レスポンシブヘッダーテキストを生成
  const terminalWidth = getTerminalWidth()
  const headerTexts = generateHeaderText(
    terminalWidth,
    journalService?.isAIAvailable() || false,
    !!commandRegistry
  )

  // ヘッダーテキストを単一の文字列に結合し、必要に応じて切り詰める
  const combinedHeaderText = combineHeaderText(headerTexts, terminalWidth)

  return (
    <Box flexDirection="column" height="100%">
      {/* ヘッダー部分 */}
      <Box flexDirection="column" flexShrink={0}>
        <Box marginBottom={1}>
          <Text dimColor>{combinedHeaderText}</Text>
        </Box>
        <Box marginBottom={1}>
          <Text>Journal</Text>
        </Box>

        {message && (
          <Box marginBottom={1}>
            <Text color="green">{message}</Text>
          </Box>
        )}

        <Box marginBottom={1}>
          <Text>
            今日の記録: {todayEntries.filter(e => !e.type || e.type === 'entry').length}件
          </Text>
          {todayEntries.filter(e => e.type === 'ai_question').length > 0 && (
            <Text color="magenta">
              {' '}
              | AI会話: {todayEntries.filter(e => e.type === 'ai_question').length}回
            </Text>
          )}
        </Box>
      </Box>

      {/* エントリー表示部分（最新10件、新しいものを下に） */}
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

              // AIエントリーの表示
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

              // 通常のエントリー表示
              return (
                <Box key={entry.id} marginBottom={1}>
                  <Text color="cyan">{time}</Text>
                  <Text color="yellow"> [{entry.category}]</Text>
                  <Text> {entry.content}</Text>
                </Box>
              )
            })}

            {/* AI処理中のローディングアニメーション */}
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

      {/* 区切り線 */}
      <Box flexShrink={0}>
        <Text color="gray">{generateTerminalSeparator(terminalWidth)}</Text>
      </Box>

      {/* 入力欄（下部固定） */}
      <Box flexShrink={0}>
        <Text color="blue">[{selectedCategory}] </Text>
        <MultilineTextInput
          value={input}
          onChange={setInput}
          onSubmit={isProcessingAI ? () => {} : handleSubmit}
          placeholder={
            isProcessingAI
              ? 'AI処理中...'
              : journalService?.isAIAvailable()
                ? '記録を入力... (/で始まるコマンド: /?, /summary, /advice, /help)'
                : '記録を入力... (/で始まるコマンド利用可能)'
          }
        />
      </Box>
    </Box>
  )
}
