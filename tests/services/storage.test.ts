import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import { StorageService } from '../../src/services/storage'
import { JournalEntry } from '../../src/models/journal'

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    access: vi.fn(),
    readdir: vi.fn(),
    unlink: vi.fn()
  }
}))

describe('StorageService', () => {
  let storage: StorageService
  const testDataPath = '/test/kotori-journal-data'

  beforeEach(() => {
    storage = new StorageService(testDataPath)
    vi.clearAllMocks()
  })

  describe('saveEntry', () => {
    it('should save a journal entry to temp file', async () => {
      const entry: JournalEntry = {
        id: 'test-123',
        content: 'テストエントリー',
        category: '仕事',
        timestamp: new Date('2025-01-11T10:00:00')
      }

      await storage.saveEntryToTemp(entry)

      expect(fs.mkdir).toHaveBeenCalledWith(
        path.join(testDataPath, '.temp'),
        { recursive: true }
      )
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0]
      expect(writeCall[0]).toBe(path.join(testDataPath, '.temp', 'test-123.json'))
      expect(writeCall[1]).toContain('"content": "テストエントリー"')
    })

    it('should handle save errors gracefully', async () => {
      const entry: JournalEntry = {
        id: 'test-123',
        content: 'テストエントリー',
        category: '仕事',
        timestamp: new Date()
      }

      vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error('Write failed'))

      await expect(storage.saveEntryToTemp(entry)).rejects.toThrow('Write failed')
    })
  })

  describe('generateDailyReport', () => {
    it('should generate markdown report for given date', async () => {
      const entries: JournalEntry[] = [
        {
          id: '1',
          content: '朝の会議に参加',
          category: '仕事',
          timestamp: new Date('2025-01-11T09:00:00')
        },
        {
          id: '2',
          content: 'ランチミーティング',
          category: '仕事',
          timestamp: new Date('2025-01-11T12:00:00')
        },
        {
          id: '3',
          content: '散歩に行った',
          category: 'プライベート',
          timestamp: new Date('2025-01-11T18:00:00')
        }
      ]

      const date = new Date('2025-01-11')
      await storage.generateDailyReport(date, entries)

      expect(fs.mkdir).toHaveBeenCalledWith(
        path.join(testDataPath, '2025', '01'),
        { recursive: true }
      )
      
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0]
      expect(writeCall[0]).toBe(path.join(testDataPath, '2025', '01', '11.md'))
      
      const content = writeCall[1] as string
      expect(content).toContain('# 2025年01月11日の記録')
      expect(content).toContain('## 仕事')
      expect(content).toContain('朝の会議に参加')
      expect(content).toContain('## プライベート')
      expect(content).toContain('散歩に行った')
    })

    it('should create empty report when no entries', async () => {
      const date = new Date('2025-01-11')
      await storage.generateDailyReport(date, [])

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0]
      const content = writeCall[1] as string
      
      expect(content).toContain('# 2025年01月11日の記録')
      expect(content).toContain('記録がありません')
    })
  })

  describe('loadTempEntries', () => {
    it('should load all temp entries', async () => {
      const tempFiles = ['entry1.json', 'entry2.json', 'not-json.txt']
      const entry1 = {
        id: '1',
        content: 'エントリー1',
        category: '仕事',
        timestamp: '2025-01-11T10:00:00.000Z'
      }
      const entry2 = {
        id: '2',
        content: 'エントリー2',
        category: 'プライベート',
        timestamp: '2025-01-11T11:00:00.000Z'
      }

      vi.mocked(fs.access).mockResolvedValue()
      vi.mocked(fs.readdir).mockResolvedValue(tempFiles as any)
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(entry1))
        .mockResolvedValueOnce(JSON.stringify(entry2))

      const entries = await storage.loadTempEntries()

      expect(entries).toHaveLength(2)
      expect(entries[0].content).toBe('エントリー1')
      expect(entries[1].content).toBe('エントリー2')
    })

    it('should return empty array when temp directory does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))

      const entries = await storage.loadTempEntries()

      expect(entries).toHaveLength(0)
    })
  })

  describe('clearTempEntries', () => {
    it('should delete all temp files', async () => {
      const tempFiles = ['entry1.json', 'entry2.json']
      
      vi.mocked(fs.access).mockResolvedValue()
      vi.mocked(fs.readdir).mockResolvedValue(tempFiles as any)
      vi.mocked(fs.unlink).mockResolvedValue()

      await storage.clearTempEntries()

      expect(fs.unlink).toHaveBeenCalledTimes(2)
      expect(fs.unlink).toHaveBeenCalledWith(
        path.join(testDataPath, '.temp', 'entry1.json')
      )
      expect(fs.unlink).toHaveBeenCalledWith(
        path.join(testDataPath, '.temp', 'entry2.json')
      )
    })
  })

  describe('searchReports', () => {
    it('should search in daily reports by keyword', async () => {
      const reportContent = `# 2025年01月11日の記録

## 仕事
- 09:00 - TypeScriptの勉強を開始
- 14:00 - コードレビュー完了

## プライベート
- 18:00 - 読書`

      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['2025'] as any)
        .mockResolvedValueOnce(['01'] as any)
        .mockResolvedValueOnce(['11.md'] as any)
      
      vi.mocked(fs.readFile).mockResolvedValue(reportContent)

      const results = await storage.searchReports('TypeScript')

      expect(results).toHaveLength(1)
      expect(results[0].date).toBe('2025-01-11')
      expect(results[0].content).toContain('TypeScriptの勉強を開始')
    })
  })
})