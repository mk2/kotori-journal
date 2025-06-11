import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { JournalService } from '../../src/services/journal-service'

describe('JournalService', () => {
  let journalService: JournalService
  let testDataPath: string

  beforeEach(async () => {
    testDataPath = path.join(os.tmpdir(), `kotori-test-${Date.now()}`)
    await fs.mkdir(testDataPath, { recursive: true })
    journalService = new JournalService(testDataPath)
  })

  afterEach(async () => {
    try {
      await fs.rm(testDataPath, { recursive: true, force: true })
    } catch (error) {
      // エラーは無視
    }
  })

  describe('initialization with temp files', () => {
    it('should preserve today entries and clear only previous day entries', async () => {
      // 独立したテスト環境を使用
      const isolatedPath = path.join(os.tmpdir(), `kotori-preserve-${Date.now()}`)
      await fs.mkdir(isolatedPath, { recursive: true })
      
      try {
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        // 一時ファイルを手動で作成（今日と昨日のエントリー）
        const tempDir = path.join(isolatedPath, '.temp')
        await fs.mkdir(tempDir, { recursive: true })

      const todayEntry = {
        id: 'today-1',
        content: '今日のエントリー',
        category: '仕事',
        timestamp: today.toISOString()
      }

      const yesterdayEntry = {
        id: 'yesterday-1',
        content: '昨日のエントリー',
        category: '仕事',
        timestamp: yesterday.toISOString()
      }

      await fs.writeFile(
        path.join(tempDir, 'today-1.json'),
        JSON.stringify(todayEntry, null, 2)
      )
      await fs.writeFile(
        path.join(tempDir, 'yesterday-1.json'),
        JSON.stringify(yesterdayEntry, null, 2)
      )

        // 初期化実行
        const service = new JournalService(isolatedPath)
        await service.initialize()

        // 今日のエントリーが残っていることを確認
        const entries = service.getEntries()
        expect(entries).toHaveLength(2) // メモリに両方読み込まれる

        // 一時ファイルの状況確認
        const tempFiles = await fs.readdir(tempDir)
        const remainingJsonFiles = tempFiles.filter(f => f.endsWith('.json'))
        
        // 今日のエントリーのみ一時ファイルに残っていることを確認
        expect(remainingJsonFiles).toHaveLength(1)
        expect(remainingJsonFiles[0]).toBe('today-1.json')
      } finally {
        try {
          await fs.rm(isolatedPath, { recursive: true, force: true })
        } catch {}
      }
    })

    it('should handle empty temp directory gracefully', async () => {
      await journalService.initialize()
      
      const entries = journalService.getEntries()
      expect(entries).toHaveLength(0)
    })

    it('should preserve temp entries across multiple initializations', async () => {
      // 独立したテスト環境を使用
      const isolatedPath = path.join(os.tmpdir(), `kotori-isolated-${Date.now()}`)
      await fs.mkdir(isolatedPath, { recursive: true })
      
      try {
        // 最初のエントリー追加
        const service1 = new JournalService(isolatedPath)
        await service1.initialize()
        await service1.addEntry('テストエントリー1', '仕事')
        
        // 新しいサービスインスタンスで初期化
        const newService = new JournalService(isolatedPath)
        await newService.initialize()
        
        // エントリーが復元されることを確認
        const entries = newService.getEntries()
        expect(entries).toHaveLength(1)
        expect(entries[0].content).toBe('テストエントリー1')
        
        // さらにエントリーを追加
        await newService.addEntry('テストエントリー2', 'プライベート')
        
        // 3回目の初期化
        const thirdService = new JournalService(isolatedPath)
        await thirdService.initialize()
        
        const finalEntries = thirdService.getEntries()
        expect(finalEntries).toHaveLength(2)
        const finalContents = finalEntries.map(e => e.content)
        expect(finalContents).toContain('テストエントリー1')
        expect(finalContents).toContain('テストエントリー2')
      } finally {
        try {
          await fs.rm(isolatedPath, { recursive: true, force: true })
        } catch {}
      }
    })
  })

  describe('daily workflow', () => {
    it('should maintain entries throughout the day', async () => {
      await journalService.initialize()
      
      // 朝のエントリー
      const morning = await journalService.addEntry('朝のタスク', '仕事')
      expect(morning.content).toBe('朝のタスク')
      
      // 昼のエントリー
      await journalService.addEntry('ランチミーティング', '仕事')
      
      // 夕方のエントリー
      await journalService.addEntry('一日の振り返り', 'プライベート')
      
      // 全エントリーが保持されていることを確認
      const allEntries = journalService.getEntries()
      expect(allEntries).toHaveLength(3)
      
      // 再初期化後も保持されることを確認
      const newService = new JournalService(testDataPath)
      await newService.initialize()
      
      const restoredEntries = newService.getEntries()
      expect(restoredEntries).toHaveLength(3)
      const contents = restoredEntries.map(e => e.content)
      expect(contents).toContain('朝のタスク')
      expect(contents).toContain('ランチミーティング')
      expect(contents).toContain('一日の振り返り')
    })
  })

  describe('category management with persistence', () => {
    it('should persist custom categories across restarts', async () => {
      // 独立したテスト環境を使用
      const isolatedPath = path.join(os.tmpdir(), `kotori-categories-service-${Date.now()}`)
      await fs.mkdir(isolatedPath, { recursive: true })
      
      try {
        const service = new JournalService(isolatedPath)
        await service.initialize()
        
        // カスタムカテゴリを追加
        const result = await service.addCategory('学習')
        expect(result).toBe(true)
        
        let categories = service.getCategories()
        expect(categories).toContain('学習')
        
        // 新しいサービスインスタンスで確認
        const newService = new JournalService(isolatedPath)
        await newService.initialize()
        
        categories = newService.getCategories()
        expect(categories).toContain('学習')
      } finally {
        try {
          await fs.rm(isolatedPath, { recursive: true, force: true })
        } catch {}
      }
    })
  })
})