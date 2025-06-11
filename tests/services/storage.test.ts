import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { StorageService } from '../../src/services/storage'
import { JournalEntry } from '../../src/models/journal'

describe('StorageService', () => {
  let storage: StorageService
  let testDataPath: string

  beforeEach(async () => {
    // 一時ディレクトリを作成
    testDataPath = path.join(os.tmpdir(), `kotori-test-${Date.now()}`)
    await fs.mkdir(testDataPath, { recursive: true })
    storage = new StorageService(testDataPath)
  })

  afterEach(async () => {
    // テストディレクトリをクリーンアップ
    try {
      await fs.rm(testDataPath, { recursive: true, force: true })
    } catch (error) {
      // エラーは無視
    }
  })

  describe('clearSpecificTempEntries', () => {
    it('should clear only specified temp entries', async () => {
      // 複数のエントリーを作成
      const entry1: JournalEntry = {
        id: 'entry-1',
        content: 'エントリー1',
        category: '仕事',
        timestamp: new Date()
      }
      const entry2: JournalEntry = {
        id: 'entry-2',
        content: 'エントリー2',
        category: '仕事',
        timestamp: new Date()
      }
      const entry3: JournalEntry = {
        id: 'entry-3',
        content: 'エントリー3',
        category: '仕事',
        timestamp: new Date()
      }

      // 一時ファイルに保存
      await storage.saveEntryToTemp(entry1)
      await storage.saveEntryToTemp(entry2)
      await storage.saveEntryToTemp(entry3)

      // entry1とentry2のみ削除
      await storage.clearSpecificTempEntries(['entry-1', 'entry-2'])

      // 残っているエントリーを確認
      const remainingEntries = await storage.loadTempEntries()
      expect(remainingEntries).toHaveLength(1)
      expect(remainingEntries[0].id).toBe('entry-3')
    })

    it('should handle non-existent entry IDs gracefully', async () => {
      const entry: JournalEntry = {
        id: 'existing-entry',
        content: 'テスト',
        category: '仕事',
        timestamp: new Date()
      }

      await storage.saveEntryToTemp(entry)

      // 存在しないIDも含めて削除を試みる
      await storage.clearSpecificTempEntries(['non-existent', 'existing-entry'])

      // 既存のエントリーが正しく削除されていることを確認
      const remainingEntries = await storage.loadTempEntries()
      expect(remainingEntries).toHaveLength(0)
    })

    it('should do nothing when temp directory does not exist', async () => {
      // 新しいStorageインスタンスを作成（tempディレクトリなし）
      const newStorage = new StorageService(path.join(testDataPath, 'non-existent'))
      
      // エラーを投げずに正常終了すること
      await expect(
        newStorage.clearSpecificTempEntries(['any-id'])
      ).resolves.not.toThrow()
    })
  })

  describe('saveEntryToTemp and loadTempEntries', () => {
    it('should save and load multiple entries correctly', async () => {
      const entries: JournalEntry[] = [
        {
          id: 'test-1',
          content: '朝のミーティング',
          category: '仕事',
          timestamp: new Date('2025-01-11T09:00:00')
        },
        {
          id: 'test-2',
          content: 'ランチ',
          category: 'プライベート',
          timestamp: new Date('2025-01-11T12:00:00')
        }
      ]

      // エントリーを保存
      for (const entry of entries) {
        await storage.saveEntryToTemp(entry)
      }

      // エントリーを読み込み
      const loadedEntries = await storage.loadTempEntries()
      
      expect(loadedEntries).toHaveLength(2)
      expect(loadedEntries[0].content).toBe('朝のミーティング')
      expect(loadedEntries[1].content).toBe('ランチ')
    })
  })

  describe('generateDailyReport', () => {
    it('should generate report with proper date formatting', async () => {
      const entries: JournalEntry[] = [
        {
          id: '1',
          content: '作業開始',
          category: '仕事',
          timestamp: new Date('2025-01-11T09:00:00')
        },
        {
          id: '2',
          content: '休憩',
          category: 'プライベート',
          timestamp: new Date('2025-01-11T15:00:00')
        }
      ]

      const reportDate = new Date('2025-01-11')
      await storage.generateDailyReport(reportDate, entries)

      // レポートファイルが作成されたことを確認
      const reportPath = path.join(testDataPath, '2025', '01', '11.md')
      const reportContent = await fs.readFile(reportPath, 'utf-8')

      expect(reportContent).toContain('# 2025年01月11日の記録')
      expect(reportContent).toContain('## 仕事')
      expect(reportContent).toContain('09:00 - 作業開始')
      expect(reportContent).toContain('## プライベート')
      expect(reportContent).toContain('15:00 - 休憩')
    })
  })
})