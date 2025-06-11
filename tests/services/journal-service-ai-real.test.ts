import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { JournalService } from '../../src/services/journal-service'

describe('JournalService AI Integration (Real)', () => {
  let testDataPath: string

  beforeEach(async () => {
    testDataPath = path.join(os.tmpdir(), `kotori-ai-real-test-${Date.now()}`)
    await fs.mkdir(testDataPath, { recursive: true })
  })

  afterEach(async () => {
    try {
      await fs.rm(testDataPath, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('AI availability without API key', () => {
    it('should not be available when API key is missing', async () => {
      // Save original API key
      const originalApiKey = process.env.ANTHROPIC_API_KEY
      
      try {
        // Remove API key
        delete process.env.ANTHROPIC_API_KEY
        
        const journalService = new JournalService(testDataPath)
        await journalService.initialize()
        
        expect(journalService.isAIAvailable()).toBe(false)
        expect(journalService.isAITrigger('？今日はどうでしたか')).toBe(false)
        
        await expect(
          journalService.processAIRequest('？今日はどうでしたか')
        ).rejects.toThrow('Claude AI is not available. Please set ANTHROPIC_API_KEY environment variable.')
        
      } finally {
        // Restore API key
        if (originalApiKey) {
          process.env.ANTHROPIC_API_KEY = originalApiKey
        }
      }
    })
  })

  describe('AI availability with API key', () => {
    it('should be available when API key is set', async () => {
      // Set API key
      process.env.ANTHROPIC_API_KEY = 'test-api-key'
      
      try {
        const journalService = new JournalService(testDataPath)
        await journalService.initialize()
        
        expect(journalService.isAIAvailable()).toBe(true)
        expect(journalService.isAITrigger('？今日はどうでしたか')).toBe(true)
        expect(journalService.isAITrigger('要約して')).toBe(true)
        expect(journalService.isAITrigger('普通のテキスト')).toBe(false)
        
        // AI会話履歴のテスト
        await journalService.addEntry('テストエントリー', '仕事')
        
        // processAIRequest はモックされているので実際のAPI呼び出しはしない
        // 代わりに手動でAI会話エントリーを追加してテスト
        const aiQuestion = await journalService.addEntry('？今日はどうでしたか', 'AI', 'ai_question')
        const aiResponse = await journalService.addEntry('今日は良い一日でしたね！', 'AI', 'ai_response')
        
        const allEntries = journalService.getEntries()
        expect(allEntries).toHaveLength(3)
        
        // エントリータイプが正しく設定されていることを確認
        expect(allEntries[0].type).toBe('entry') // デフォルトは'entry'
        expect(allEntries[1].type).toBe('ai_question')
        expect(allEntries[2].type).toBe('ai_response')
        
      } finally {
        delete process.env.ANTHROPIC_API_KEY
      }
    })
  })
})