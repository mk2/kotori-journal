import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ClaudeAIService } from '../../src/services/claude-ai'
import { JournalEntry } from '../../src/models/journal'

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn()
      }
    }))
  }
})

describe('ClaudeAIService', () => {
  let claudeAI: ClaudeAIService
  let mockAnthropic: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Mock environment variable
    process.env.ANTHROPIC_API_KEY = 'test-api-key'
    
    claudeAI = new ClaudeAIService()
    mockAnthropic = (claudeAI as any).anthropic
  })

  describe('initialization', () => {
    it('should initialize with API key from environment', () => {
      expect(claudeAI).toBeDefined()
    })

    it('should throw error when API key is missing', () => {
      const originalApiKey = process.env.ANTHROPIC_API_KEY
      delete process.env.ANTHROPIC_API_KEY
      
      try {
        expect(() => new ClaudeAIService()).toThrow('ANTHROPIC_API_KEY environment variable is required')
      } finally {
        // Restore the original API key
        if (originalApiKey) {
          process.env.ANTHROPIC_API_KEY = originalApiKey
        }
      }
    })
  })

  describe('isAITrigger', () => {
    it('should detect question trigger', () => {
      expect(claudeAI.isAITrigger('？今日はどうでしたか')).toBe(true)
      expect(claudeAI.isAITrigger('?今日はどうでしたか')).toBe(true)
    })

    it('should detect summary trigger', () => {
      expect(claudeAI.isAITrigger('要約して')).toBe(true)
      expect(claudeAI.isAITrigger('まとめて')).toBe(true)
    })

    it('should detect advice trigger', () => {
      expect(claudeAI.isAITrigger('アドバイスして')).toBe(true)
      expect(claudeAI.isAITrigger('助言をください')).toBe(true)
    })

    it('should not detect non-trigger text', () => {
      expect(claudeAI.isAITrigger('今日は良い天気でした')).toBe(false)
      expect(claudeAI.isAITrigger('仕事が忙しかった')).toBe(false)
    })
  })

  describe('processAIRequest', () => {
    const sampleEntries: JournalEntry[] = [
      {
        id: '1',
        content: '朝の会議で新しいプロジェクトについて話し合った',
        category: '仕事',
        timestamp: new Date('2025-01-11T09:00:00')
      },
      {
        id: '2',
        content: 'ランチは友人と美味しいパスタを食べた',
        category: 'プライベート',
        timestamp: new Date('2025-01-11T12:00:00')
      }
    ]

    beforeEach(() => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'AI response here' }]
      })
    })

    it('should process question request', async () => {
      const result = await claudeAI.processAIRequest('？今日はどうでしたか', sampleEntries)
      
      expect(result).toBe('AI response here')
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: expect.stringContaining('以下は今日のジャーナルエントリーです')
        }]
      })
    })

    it('should process summary request', async () => {
      const result = await claudeAI.processAIRequest('要約して', sampleEntries)
      
      expect(result).toBe('AI response here')
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: expect.stringContaining('以下のジャーナルエントリーを要約してください')
        }]
      })
    })

    it('should process advice request', async () => {
      const result = await claudeAI.processAIRequest('アドバイスして', sampleEntries)
      
      expect(result).toBe('AI response here')
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: expect.stringContaining('以下のジャーナルエントリーに基づいてアドバイスをください')
        }]
      })
    })

    it('should handle empty entries gracefully', async () => {
      const result = await claudeAI.processAIRequest('？今日はどうでしたか', [])
      
      expect(result).toBe('AI response here')
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: expect.stringContaining('今日はまだジャーナルエントリーがありません')
        }]
      })
    })

    it('should handle API errors', async () => {
      mockAnthropic.messages.create.mockRejectedValue(new Error('API Error'))
      
      await expect(
        claudeAI.processAIRequest('？今日はどうでしたか', sampleEntries)
      ).rejects.toThrow('Claude API request failed: API Error')
    })

    it('should handle non-trigger text', async () => {
      await expect(
        claudeAI.processAIRequest('普通のテキスト', sampleEntries)
      ).rejects.toThrow('Not an AI trigger')
    })
  })

  describe('formatEntriesForAI', () => {
    it('should format entries correctly', () => {
      const entries: JournalEntry[] = [
        {
          id: '1',
          content: 'テストエントリー1',
          category: '仕事',
          timestamp: new Date('2025-01-11T09:00:00')
        },
        {
          id: '2',
          content: 'テストエントリー2',
          category: 'プライベート',
          timestamp: new Date('2025-01-11T15:00:00')
        }
      ]

      const formatted = (claudeAI as any).formatEntriesForAI(entries)
      
      expect(formatted).toContain('09:00 [仕事] テストエントリー1')
      expect(formatted).toContain('15:00 [プライベート] テストエントリー2')
    })

    it('should handle empty entries', () => {
      const formatted = (claudeAI as any).formatEntriesForAI([])
      expect(formatted).toBe('(エントリーなし)')
    })
  })
})