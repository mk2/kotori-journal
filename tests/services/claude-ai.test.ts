import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ClaudeAIService, KotoriMode, EmotionAnalysis } from '../../src/services/claude-ai'
import { JournalEntry } from '../../src/models/journal'

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
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
        expect(() => new ClaudeAIService()).toThrow(
          'ANTHROPIC_API_KEY environment variable is required'
        )
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

    it('should detect fantasy trigger', () => {
      expect(claudeAI.isAITrigger('妄想してみて')).toBe(true)
      expect(claudeAI.isAITrigger('想像すると')).toBe(true)
      expect(claudeAI.isAITrigger('もしもこうだったら')).toBe(true)
    })

    it('should not detect non-trigger text', () => {
      expect(claudeAI.isAITrigger('今日は良い天気でした')).toBe(false)
      expect(claudeAI.isAITrigger('仕事が忙しかった')).toBe(false)
    })
  })

  describe('analyzeEmotion', () => {
    it('should detect joy emotion', () => {
      const entries: JournalEntry[] = [
        {
          id: '1',
          content: '今日は嬉しいことがあった。プロジェクトが成功して最高だった',
          category: '仕事',
          timestamp: new Date(),
        },
      ]

      const emotion = (claudeAI as any).analyzeEmotion(entries)

      expect(emotion.dominant).toBe('joy')
      expect(emotion.keywords).toContain('嬉しい')
      expect(emotion.keywords).toContain('成功')
      expect(emotion.keywords).toContain('最高')
      expect(emotion.intensity).toBe('high')
    })

    it('should detect sadness emotion', () => {
      const entries: JournalEntry[] = [
        {
          id: '1',
          content: '今日は悲しいことがあった。失敗してしまった',
          category: 'プライベート',
          timestamp: new Date(),
        },
      ]

      const emotion = (claudeAI as any).analyzeEmotion(entries)

      expect(emotion.dominant).toBe('sadness')
      expect(emotion.keywords).toContain('悲しい')
      expect(emotion.keywords).toContain('失敗')
      expect(emotion.intensity).toBe('medium')
    })

    it('should detect fatigue emotion', () => {
      const entries: JournalEntry[] = [
        {
          id: '1',
          content: '疲れた。眠いし、だるい。もう限界',
          category: '仕事',
          timestamp: new Date(),
        },
      ]

      const emotion = (claudeAI as any).analyzeEmotion(entries)

      expect(emotion.dominant).toBe('fatigue')
      expect(emotion.keywords).toContain('疲れ')
      expect(emotion.keywords).toContain('眠い')
      expect(emotion.keywords).toContain('だるい')
      expect(emotion.keywords).toContain('限界')
      expect(emotion.intensity).toBe('high')
    })

    it('should detect anger emotion', () => {
      const entries: JournalEntry[] = [
        {
          id: '1',
          content: 'イライラする。腹立つし、ストレスが溜まる',
          category: '仕事',
          timestamp: new Date(),
        },
      ]

      const emotion = (claudeAI as any).analyzeEmotion(entries)

      expect(emotion.dominant).toBe('anger')
      expect(emotion.keywords).toContain('イライラ')
      expect(emotion.keywords).toContain('腹立つ')
      expect(emotion.keywords).toContain('ストレス')
      expect(emotion.intensity).toBe('high')
    })

    it('should return neutral when no emotion keywords found', () => {
      const entries: JournalEntry[] = [
        {
          id: '1',
          content: '今日は会議があった',
          category: '仕事',
          timestamp: new Date(),
        },
      ]

      const emotion = (claudeAI as any).analyzeEmotion(entries)

      expect(emotion.dominant).toBe('neutral')
      expect(emotion.intensity).toBe('low')
      expect(emotion.keywords).toHaveLength(0)
    })
  })

  describe('determineKotoriMode', () => {
    it('should return fantasy mode for fantasy triggers', () => {
      const emotion: EmotionAnalysis = { dominant: 'neutral', intensity: 'low', keywords: [] }

      expect((claudeAI as any).determineKotoriMode('妄想してみて', emotion)).toBe('fantasy')
      expect((claudeAI as any).determineKotoriMode('想像すると', emotion)).toBe('fantasy')
      expect((claudeAI as any).determineKotoriMode('もしもこうだったら', emotion)).toBe('fantasy')
    })

    it('should return healing mode for sadness', () => {
      const emotion: EmotionAnalysis = {
        dominant: 'sadness',
        intensity: 'high',
        keywords: ['悲しい'],
      }

      expect((claudeAI as any).determineKotoriMode('？今日はどうでしたか', emotion)).toBe('healing')
    })

    it('should return healing mode for fatigue', () => {
      const emotion: EmotionAnalysis = {
        dominant: 'fatigue',
        intensity: 'high',
        keywords: ['疲れ'],
      }

      expect((claudeAI as any).determineKotoriMode('？今日はどうでしたか', emotion)).toBe('healing')
    })

    it('should return healing mode for anger', () => {
      const emotion: EmotionAnalysis = {
        dominant: 'anger',
        intensity: 'medium',
        keywords: ['イライラ'],
      }

      expect((claudeAI as any).determineKotoriMode('？今日はどうでしたか', emotion)).toBe('healing')
    })

    it('should return basic mode for joy and neutral', () => {
      const joyEmotion: EmotionAnalysis = {
        dominant: 'joy',
        intensity: 'high',
        keywords: ['嬉しい'],
      }
      const neutralEmotion: EmotionAnalysis = {
        dominant: 'neutral',
        intensity: 'low',
        keywords: [],
      }

      expect((claudeAI as any).determineKotoriMode('？今日はどうでしたか', joyEmotion)).toBe(
        'basic'
      )
      expect((claudeAI as any).determineKotoriMode('？今日はどうでしたか', neutralEmotion)).toBe(
        'basic'
      )
    })
  })

  describe('processAIRequest', () => {
    const sampleEntries: JournalEntry[] = [
      {
        id: '1',
        content: '朝の会議で新しいプロジェクトについて話し合った',
        category: '仕事',
        timestamp: new Date('2025-01-11T09:00:00'),
      },
      {
        id: '2',
        content: 'ランチは友人と美味しいパスタを食べた',
        category: 'プライベート',
        timestamp: new Date('2025-01-11T12:00:00'),
      },
    ]

    beforeEach(() => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'AI response here' }],
      })
    })

    it('should process question request with Kotori persona', async () => {
      const result = await claudeAI.processAIRequest('？今日はどうでしたか', sampleEntries)

      expect(result).toBe('AI response here')
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: expect.stringContaining(
              'あなたは765プロダクションの事務員「音無小鳥」として応答してください'
            ),
          },
        ],
      })
    })

    it('should include character settings in prompt', async () => {
      await claudeAI.processAIRequest('？今日はどうでしたか', sampleEntries)

      const callArgs = mockAnthropic.messages.create.mock.calls[0][0]
      const prompt = callArgs.messages[0].content

      expect(prompt).toContain('20代後半の女性事務員')
      expect(prompt).toContain('プロデューサーを支える"お姉さん"ポジション')
      expect(prompt).toContain('愛称は「ピヨちゃん」')
      expect(prompt).toContain('「ピヨ〜」「チュン♪」')
    })

    it('should include emotion analysis in prompt', async () => {
      const sadEntries: JournalEntry[] = [
        {
          id: '1',
          content: '今日は悲しいことがあった',
          category: 'プライベート',
          timestamp: new Date(),
        },
      ]

      await claudeAI.processAIRequest('？今日はどうでしたか', sadEntries)

      const callArgs = mockAnthropic.messages.create.mock.calls[0][0]
      const prompt = callArgs.messages[0].content

      expect(prompt).toContain('支配的感情: sadness')
      expect(prompt).toContain('感情キーワード: 悲しい')
    })

    it('should use healing mode for sad entries', async () => {
      const sadEntries: JournalEntry[] = [
        {
          id: '1',
          content: '今日は悲しくて辛い一日だった',
          category: 'プライベート',
          timestamp: new Date(),
        },
      ]

      await claudeAI.processAIRequest('？今日はどうでしたか', sadEntries)

      const callArgs = mockAnthropic.messages.create.mock.calls[0][0]
      const prompt = callArgs.messages[0].content

      expect(prompt).toContain('現在のモード: healing')
      expect(prompt).toContain('癒しモード')
      expect(prompt).toContain('優しく寄り添い、無理をしないよう声をかけてください')
    })

    it('should use fantasy mode for fantasy triggers', async () => {
      await claudeAI.processAIRequest('妄想してみて', sampleEntries)

      const callArgs = mockAnthropic.messages.create.mock.calls[0][0]
      const prompt = callArgs.messages[0].content

      expect(prompt).toContain('現在のモード: fantasy')
      expect(prompt).toContain('妄想モード')
      expect(prompt).toContain('乙女ゲーム風の高テンション')
    })

    it('should handle empty entries gracefully', async () => {
      const result = await claudeAI.processAIRequest('？今日はどうでしたか', [])

      expect(result).toBe('AI response here')
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('今日はまだエントリーがありません'),
          },
        ],
      })
    })

    it('should handle API errors', async () => {
      mockAnthropic.messages.create.mockRejectedValue(new Error('API Error'))

      await expect(
        claudeAI.processAIRequest('？今日はどうでしたか', sampleEntries)
      ).rejects.toThrow('Claude API request failed: API Error')
    })

    it('should handle non-trigger text', async () => {
      await expect(claudeAI.processAIRequest('普通のテキスト', sampleEntries)).rejects.toThrow(
        'Not an AI trigger'
      )
    })
  })

  describe('formatEntriesForAI', () => {
    it('should format entries correctly', () => {
      const entries: JournalEntry[] = [
        {
          id: '1',
          content: 'テストエントリー1',
          category: '仕事',
          timestamp: new Date('2025-01-11T09:00:00'),
        },
        {
          id: '2',
          content: 'テストエントリー2',
          category: 'プライベート',
          timestamp: new Date('2025-01-11T15:00:00'),
        },
      ]

      const formatted = (claudeAI as any).formatEntriesForAI(entries)

      expect(formatted).toContain('09:00 [仕事] テストエントリー1')
      expect(formatted).toContain('15:00 [プライベート] テストエントリー2')
    })

    it('should handle empty entries', () => {
      const formatted = (claudeAI as any).formatEntriesForAI([])
      expect(formatted).toBe('(今日はまだエントリーがありません)')
    })
  })
})
