import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { JournalService } from '../../src/services/journal-service'

// Mock the Claude AI service
vi.mock('../../src/services/claude-ai', () => {
  return {
    ClaudeAIService: vi.fn().mockImplementation(() => ({
      isAITrigger: vi.fn((text: string) => text.includes('？') || text.includes('要約')),
      processAIRequest: vi.fn().mockResolvedValue('This is a mock AI response'),
    })),
  }
})

describe('AI Conversation History', () => {
  let testDataPath: string
  let journalService: JournalService

  beforeEach(async () => {
    testDataPath = path.join(os.tmpdir(), `kotori-ai-history-test-${Date.now()}`)
    await fs.mkdir(testDataPath, { recursive: true })

    process.env.ANTHROPIC_API_KEY = 'test-api-key'

    journalService = new JournalService(testDataPath)
    await journalService.initialize()
  })

  afterEach(async () => {
    try {
      await fs.rm(testDataPath, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
    delete process.env.ANTHROPIC_API_KEY
  })

  it('should add AI conversation to history', async () => {
    // 通常のエントリーを追加
    await journalService.addEntry('今日は良い天気でした', '仕事')

    // AI質問を処理
    const { question, response } = await journalService.processAIRequest('？今日はどうでしたか')

    // エントリーが正しく追加されていることを確認
    const allEntries = journalService.getEntries()
    expect(allEntries).toHaveLength(3)

    // AI質問エントリーの確認
    expect(question.content).toBe('？今日はどうでしたか')
    expect(question.category).toBe('AI')
    expect(question.type).toBe('ai_question')

    // AI応答エントリーの確認
    expect(response.content).toBe('This is a mock AI response')
    expect(response.category).toBe('AI')
    expect(response.type).toBe('ai_response')
  })

  it('should persist AI conversations across restarts', async () => {
    // AI会話を追加
    await journalService.processAIRequest('？テスト質問')

    // 新しいサービスインスタンスで復元
    const newService = new JournalService(testDataPath)
    await newService.initialize()

    const entries = newService.getEntries()
    expect(entries).toHaveLength(2) // 質問 + 応答

    // エントリーの順序は時系列順なので、質問が先、応答が後
    const questionEntry = entries.find(e => e.type === 'ai_question')
    const responseEntry = entries.find(e => e.type === 'ai_response')

    expect(questionEntry).toBeDefined()
    expect(responseEntry).toBeDefined()
    expect(questionEntry?.content).toBe('？テスト質問')
    expect(responseEntry?.content).toBe('This is a mock AI response')
  })

  it('should exclude AI conversations from daily reports', async () => {
    const today = new Date()

    // 通常のエントリーとAI会話を追加
    await journalService.addEntry('朝の会議', '仕事')
    await journalService.processAIRequest('？今日はどうでしたか')
    await journalService.addEntry('夜の振り返り', 'プライベート')

    const allEntries = journalService.getEntriesByDate(today)
    const journalOnlyEntries = journalService.getJournalEntriesByDate(today)

    // 全エントリーは5個（通常2個 + AI質問1個 + AI応答1個）
    expect(allEntries).toHaveLength(4)

    // 日報用エントリーは通常のもののみ2個
    expect(journalOnlyEntries).toHaveLength(2)
    expect(journalOnlyEntries.every(entry => entry.type === 'entry')).toBe(true)
  })
})
