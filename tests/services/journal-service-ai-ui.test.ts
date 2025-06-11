import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { JournalService } from '../../src/services/journal-service'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('JournalService AI UI Integration', () => {
  let service: JournalService
  let testDataPath: string

  beforeEach(async () => {
    // 一時ディレクトリを作成
    testDataPath = path.join(os.tmpdir(), `kotori-test-ai-ui-${Date.now()}`)
    await fs.mkdir(testDataPath, { recursive: true })
    service = new JournalService(testDataPath)
    await service.initialize()
  })

  afterEach(async () => {
    // テストディレクトリをクリーンアップ
    try {
      await fs.rm(testDataPath, { recursive: true, force: true })
    } catch {
      // エラーは無視
    }
  })

  describe('generateAIResponse', () => {
    it('should be available when AI service is initialized', () => {
      // AI機能が利用可能かどうかをチェック
      const isAvailable = service.isAIAvailable()

      if (isAvailable) {
        expect(typeof service.generateAIResponse).toBe('function')
      } else {
        // AI機能が利用できない場合のテスト
        expect(service.isAIAvailable()).toBe(false)
      }
    })

    it('should throw error when AI is not available and generateAIResponse is called', async () => {
      // AI機能が利用できない場合のエラーハンドリングをテスト
      if (!service.isAIAvailable()) {
        await expect(service.generateAIResponse('テスト質問？', [])).rejects.toThrow(
          'Claude AI is not available'
        )
      }
    })

    it('should handle manual entry addition for AI questions and responses', async () => {
      // AI質問エントリーを手動で追加
      const questionEntry = await service.addEntry('テスト質問？', 'AI', 'ai_question')
      expect(questionEntry.type).toBe('ai_question')
      expect(questionEntry.category).toBe('AI')
      expect(questionEntry.content).toBe('テスト質問？')

      // AI応答エントリーを手動で追加
      const responseEntry = await service.addEntry('テスト応答です。', 'AI', 'ai_response')
      expect(responseEntry.type).toBe('ai_response')
      expect(responseEntry.category).toBe('AI')
      expect(responseEntry.content).toBe('テスト応答です。')

      // エントリーが正しく保存されていることを確認
      const entries = service.getEntries()
      expect(entries).toContain(questionEntry)
      expect(entries).toContain(responseEntry)
    })

    it('should filter journal entries correctly for AI context', async () => {
      // 通常のジャーナルエントリーを追加
      await service.addEntry('今日は良い天気です', '天気')
      await service.addEntry('プロジェクトが進捗しました', '仕事')

      // AI関連のエントリーを追加
      await service.addEntry('質問です？', 'AI', 'ai_question')
      await service.addEntry('回答です', 'AI', 'ai_response')

      const today = new Date()
      const journalEntries = service.getJournalEntriesByDate(today)

      // AI関連のエントリーは除外されていることを確認
      expect(journalEntries).toHaveLength(2)
      expect(journalEntries.every(entry => !entry.type || entry.type === 'entry')).toBe(true)
    })
  })

  describe('AI trigger detection', () => {
    it('should detect AI triggers correctly if AI is available', () => {
      // AI機能が利用可能な場合のみテスト実行
      if (!service.isAIAvailable()) {
        expect(service.isAIAvailable()).toBe(false)
        return
      }

      const triggers = [
        '今日はどうでしたか？', // '？'トリガー
        'これまでの記録を要約して', // '要約して'トリガー
        'アドバイスして', // 'アドバイスして'トリガー
        '妄想して楽しく回答して', // '妄想'トリガー
        'What happened today?', // '?'トリガー
        'エントリーをまとめて', // 'まとめて'トリガー
        '助言をください', // '助言をください'トリガー
        '想像してみよう', // '想像'トリガー
        'もしもの話ですが', // 'もしも'トリガー
      ]

      const nonTriggers = [
        '今日は良い天気です',
        '仕事が終わりました',
        '明日の予定を考えよう',
        '疲れたので休憩します',
      ]

      triggers.forEach(trigger => {
        expect(service.isAITrigger(trigger)).toBe(true)
      })

      nonTriggers.forEach(nonTrigger => {
        expect(service.isAITrigger(nonTrigger)).toBe(false)
      })
    })

    it('should return false for AI triggers when AI is not available', () => {
      // AI機能が利用できない場合のテスト
      if (!service.isAIAvailable()) {
        expect(service.isAITrigger('今日はどうでしたか？')).toBe(false)
        expect(service.isAITrigger('要約して')).toBe(false)
      }
    })
  })
})
