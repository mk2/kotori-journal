import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  QuestionCommand,
  SummaryCommand,
  AdviceCommand,
  HelpCommand,
} from '../../src/commands/ai-commands'
import { CommandContext } from '../../src/models/command'
import { JournalEntry } from '../../src/models/journal'

// モックサービス
const mockJournalService = {
  isAIAvailable: vi.fn(),
  getJournalEntriesByDate: vi.fn(),
  generateAIResponse: vi.fn(),
  addEntry: vi.fn(),
}

const mockContext: CommandContext = {
  input: '',
  entries: [],
  services: {
    journal: mockJournalService as any,
    storage: {} as any,
    search: {} as any,
  },
  ui: {
    setMessage: vi.fn(),
    setEntries: vi.fn(),
    addEntry: vi.fn(),
  },
}

describe('AI Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('QuestionCommand', () => {
    let command: QuestionCommand

    beforeEach(() => {
      command = new QuestionCommand()
    })

    it('should have correct properties', () => {
      expect(command.name).toBe('question')
      expect(command.description).toBe('AIに質問する')
      expect(command.triggers).toContain('question')
    })

    it('should check if AI is available', () => {
      mockJournalService.isAIAvailable.mockReturnValue(true)
      expect(command.canExecute(mockContext)).toBe(true)

      mockJournalService.isAIAvailable.mockReturnValue(false)
      expect(command.canExecute(mockContext)).toBe(false)
    })

    it('should return error for empty input', async () => {
      mockContext.input = '/question   ' // 空のスペースのみ
      const result = await command.execute(mockContext)

      expect(result.type).toBe('error')
      expect(result.content).toContain('質問内容を入力してください')
    })

    it('should execute AI question successfully', async () => {
      const mockTodayEntries: JournalEntry[] = [
        {
          id: '1',
          content: 'Test entry',
          category: 'テスト',
          timestamp: new Date(),
          type: 'entry',
        },
      ]

      mockJournalService.getJournalEntriesByDate.mockReturnValue(mockTodayEntries)
      mockJournalService.generateAIResponse.mockResolvedValue('AI response')
      mockJournalService.addEntry.mockResolvedValue({
        id: '2',
        content: 'AI response',
        category: 'AI',
        timestamp: new Date(),
        type: 'ai_response',
      })

      mockContext.input = '/question 今日はどんな日でしたか？'
      const result = await command.execute(mockContext)

      expect(result.type).toBe('action')
      expect(result.content).toBe('AI応答を生成しました')
      expect(mockJournalService.generateAIResponse).toHaveBeenCalledWith(
        '今日はどんな日でしたか？',
        mockTodayEntries,
        true
      )
      expect(mockContext.ui.addEntry).toHaveBeenCalled()
    })

    it('should handle AI processing errors', async () => {
      mockJournalService.getJournalEntriesByDate.mockReturnValue([])
      mockJournalService.generateAIResponse.mockRejectedValue(new Error('AI error'))

      mockContext.input = '/question test question'
      const result = await command.execute(mockContext)

      expect(result.type).toBe('error')
      expect(result.content).toContain('AI処理でエラーが発生しました')
    })
  })

  describe('SummaryCommand', () => {
    let command: SummaryCommand

    beforeEach(() => {
      command = new SummaryCommand()
    })

    it('should have correct properties', () => {
      expect(command.name).toBe('summary')
      expect(command.description).toBe('今日のエントリーを要約する')
      expect(command.triggers).toContain('summary')
      expect(command.triggers).toContain('要約')
    })

    it('should check if AI is available', () => {
      mockJournalService.isAIAvailable.mockReturnValue(true)
      expect(command.canExecute(mockContext)).toBe(true)

      mockJournalService.isAIAvailable.mockReturnValue(false)
      expect(command.canExecute(mockContext)).toBe(false)
    })

    it('should return message when no entries exist', async () => {
      mockJournalService.getJournalEntriesByDate.mockReturnValue([])

      const result = await command.execute(mockContext)

      expect(result.type).toBe('display')
      expect(result.content).toBe('今日のエントリーがまだありません。')
    })

    it('should execute summary successfully', async () => {
      const mockTodayEntries: JournalEntry[] = [
        {
          id: '1',
          content: 'Morning work',
          category: '仕事',
          timestamp: new Date(),
          type: 'entry',
        },
      ]

      mockJournalService.getJournalEntriesByDate.mockReturnValue(mockTodayEntries)
      mockJournalService.generateAIResponse.mockResolvedValue('Today summary')
      mockJournalService.addEntry.mockResolvedValue({
        id: '2',
        content: 'Today summary',
        category: 'AI',
        timestamp: new Date(),
        type: 'ai_response',
      })

      const result = await command.execute(mockContext)

      expect(result.type).toBe('action')
      expect(result.content).toBe('今日のエントリーの要約を生成しました')
      expect(mockJournalService.generateAIResponse).toHaveBeenCalledWith(
        '要約して',
        mockTodayEntries,
        true
      )
    })
  })

  describe('AdviceCommand', () => {
    let command: AdviceCommand

    beforeEach(() => {
      command = new AdviceCommand()
    })

    it('should have correct properties', () => {
      expect(command.name).toBe('advice')
      expect(command.description).toBe('今日の活動に基づいてアドバイスを受ける')
      expect(command.triggers).toContain('advice')
      expect(command.triggers).toContain('アドバイス')
    })

    it('should check if AI is available', () => {
      mockJournalService.isAIAvailable.mockReturnValue(true)
      expect(command.canExecute(mockContext)).toBe(true)

      mockJournalService.isAIAvailable.mockReturnValue(false)
      expect(command.canExecute(mockContext)).toBe(false)
    })

    it('should return message when no entries exist', async () => {
      mockJournalService.getJournalEntriesByDate.mockReturnValue([])

      const result = await command.execute(mockContext)

      expect(result.type).toBe('display')
      expect(result.content).toBe(
        '今日のエントリーがまだありません。まずは何か記録してみてください。'
      )
    })

    it('should execute advice successfully', async () => {
      const mockTodayEntries: JournalEntry[] = [
        {
          id: '1',
          content: 'Feeling stressed',
          category: 'プライベート',
          timestamp: new Date(),
          type: 'entry',
        },
      ]

      mockJournalService.getJournalEntriesByDate.mockReturnValue(mockTodayEntries)
      mockJournalService.generateAIResponse.mockResolvedValue('Take a break')
      mockJournalService.addEntry.mockResolvedValue({
        id: '2',
        content: 'Take a break',
        category: 'AI',
        timestamp: new Date(),
        type: 'ai_response',
      })

      const result = await command.execute(mockContext)

      expect(result.type).toBe('action')
      expect(result.content).toBe('アドバイスを生成しました')
      expect(mockJournalService.generateAIResponse).toHaveBeenCalledWith(
        'アドバイスして',
        mockTodayEntries,
        true
      )
    })
  })

  describe('HelpCommand', () => {
    let command: HelpCommand

    beforeEach(() => {
      command = new HelpCommand()
    })

    it('should have correct properties', () => {
      expect(command.name).toBe('help')
      expect(command.description).toBe('利用可能なコマンドを表示')
      expect(command.triggers).toContain('help')
      expect(command.triggers).toContain('ヘルプ')
    })

    it('should return help text', async () => {
      const result = await command.execute(mockContext)

      expect(result.type).toBe('display')
      expect(result.content).toContain('利用可能なコマンド:')
      expect(result.content).toContain('/? または /question')
      expect(result.content).toContain('/summary')
      expect(result.content).toContain('/advice')
      expect(result.content).toContain('/help')
    })
  })

  describe('Trigger matching', () => {
    it('should match regex triggers correctly', () => {
      const questionCommand = new QuestionCommand()
      const regexTriggers = questionCommand.triggers.filter(trigger => trigger instanceof RegExp)

      expect(regexTriggers).toHaveLength(1)
      const regexTrigger = regexTriggers[0] as RegExp

      expect(regexTrigger.test('？今日はどうでしたか')).toBe(true)
      expect(regexTrigger.test('?How was today')).toBe(true)
      expect(regexTrigger.test('今日はどうでしたか')).toBe(false)
    })

    it('should match string triggers correctly', () => {
      const summaryCommand = new SummaryCommand()
      const stringTriggers = summaryCommand.triggers.filter(trigger => typeof trigger === 'string')

      expect(stringTriggers).toContain('summary')
      expect(stringTriggers).toContain('summarize')
      expect(stringTriggers).toContain('要約')
      expect(stringTriggers).toContain('まとめ')
    })
  })
})
