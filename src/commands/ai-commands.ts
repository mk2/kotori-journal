import { Command, CommandContext, CommandResult } from '../models/command'

export class QuestionCommand implements Command {
  name = 'question'
  triggers = [/^[？?]/, 'question', 'ask']
  description = 'AIに質問する'

  canExecute(_context: CommandContext): boolean {
    return _context.services.journal.isAIAvailable()
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    const input = context.input.replace(/^\/([？?]|question|ask)?\s*/, '').trim()
    if (!input) {
      return {
        type: 'error',
        content: '質問内容を入力してください。例: /? 今日はどんな一日でしたか',
      }
    }

    try {
      // 今日のジャーナルエントリーのみを取得（AI会話は除く）
      const today = new Date()
      const todayJournalEntries = context.services.journal.getJournalEntriesByDate(today)

      // AI応答を取得
      const response = await context.services.journal.generateAIResponse(input, todayJournalEntries)

      // AI応答を履歴に追加
      const responseEntry = await context.services.journal.addEntry(response, 'AI', 'ai_response')
      context.ui.addEntry(responseEntry)

      return {
        type: 'action',
        content: 'AI応答を生成しました',
        data: { response },
      }
    } catch (error) {
      return {
        type: 'error',
        content:
          'AI処理でエラーが発生しました: ' +
          (error instanceof Error ? error.message : String(error)),
      }
    }
  }
}

export class SummaryCommand implements Command {
  name = 'summary'
  triggers = ['summary', 'summarize', '要約', 'まとめ']
  description = '今日のエントリーを要約する'

  canExecute(_context: CommandContext): boolean {
    return _context.services.journal.isAIAvailable()
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      const today = new Date()
      const todayJournalEntries = context.services.journal.getJournalEntriesByDate(today)

      if (todayJournalEntries.length === 0) {
        return {
          type: 'display',
          content: '今日のエントリーがまだありません。',
        }
      }

      const summaryRequest = '要約して'
      const response = await context.services.journal.generateAIResponse(
        summaryRequest,
        todayJournalEntries
      )

      // AI応答を履歴に追加
      const responseEntry = await context.services.journal.addEntry(response, 'AI', 'ai_response')
      context.ui.addEntry(responseEntry)

      return {
        type: 'action',
        content: '今日のエントリーの要約を生成しました',
        data: { response },
      }
    } catch (error) {
      return {
        type: 'error',
        content:
          'AI処理でエラーが発生しました: ' +
          (error instanceof Error ? error.message : String(error)),
      }
    }
  }
}

export class AdviceCommand implements Command {
  name = 'advice'
  triggers = ['advice', 'advise', 'アドバイス', '助言']
  description = '今日の活動に基づいてアドバイスを受ける'

  canExecute(_context: CommandContext): boolean {
    return _context.services.journal.isAIAvailable()
  }

  async execute(context: CommandContext): Promise<CommandResult> {
    try {
      const today = new Date()
      const todayJournalEntries = context.services.journal.getJournalEntriesByDate(today)

      if (todayJournalEntries.length === 0) {
        return {
          type: 'display',
          content: '今日のエントリーがまだありません。まずは何か記録してみてください。',
        }
      }

      const adviceRequest = 'アドバイスして'
      const response = await context.services.journal.generateAIResponse(
        adviceRequest,
        todayJournalEntries
      )

      // AI応答を履歴に追加
      const responseEntry = await context.services.journal.addEntry(response, 'AI', 'ai_response')
      context.ui.addEntry(responseEntry)

      return {
        type: 'action',
        content: 'アドバイスを生成しました',
        data: { response },
      }
    } catch (error) {
      return {
        type: 'error',
        content:
          'AI処理でエラーが発生しました: ' +
          (error instanceof Error ? error.message : String(error)),
      }
    }
  }
}

export class HelpCommand implements Command {
  name = 'help'
  triggers = ['help', 'h', 'ヘルプ']
  description = '利用可能なコマンドを表示'

  async execute(_context: CommandContext): Promise<CommandResult> {
    // CommandRegistryから取得するため、別途実装が必要
    return {
      type: 'display',
      content: `利用可能なコマンド:
/? または /question - AIに質問する
/summary - 今日のエントリーを要約する
/advice - アドバイスを受ける
/help - このヘルプを表示

例:
/? 今日はどんな一日でしたか
/summary
/advice`,
    }
  }
}
