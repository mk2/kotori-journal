import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { JournalService } from '../../src/services/journal-service'

describe('Journal Workflow Integration Tests', () => {
  let testDataPath: string
  let journalService: JournalService

  beforeEach(async () => {
    // Create temporary test directory
    testDataPath = path.join(os.tmpdir(), `kotori-test-${Date.now()}`)
    await fs.mkdir(testDataPath, { recursive: true })

    journalService = new JournalService(testDataPath)
    await journalService.initialize()
  })

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDataPath, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('should handle complete journal workflow', async () => {
    // 新しい独立したサービスを使用
    const isolatedPath = path.join(os.tmpdir(), `kotori-workflow-${Date.now()}`)
    await fs.mkdir(isolatedPath, { recursive: true })

    try {
      const service = new JournalService(isolatedPath)
      await service.initialize()

      // Add entries
      const entry1 = await service.addEntry('朝の会議に参加', '仕事')
      const entry2 = await service.addEntry('ランチを食べた', 'プライベート')

      expect(entry1.content).toBe('朝の会議に参加')
      expect(entry1.category).toBe('仕事')
      expect(entry2.content).toBe('ランチを食べた')
      expect(entry2.category).toBe('プライベート')

      // Get all entries
      const allEntries = service.getEntries()
      expect(allEntries).toHaveLength(2)

      // Search entries
      const workEntries = service.getEntriesByCategory('仕事')
      expect(workEntries).toHaveLength(1)
      expect(workEntries[0].content).toBe('朝の会議に参加')

      // Search by keyword
      const searchResults = service.searchEntries('会議')
      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].content).toBe('朝の会議に参加')
    } finally {
      try {
        await fs.rm(isolatedPath, { recursive: true, force: true })
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  it('should manage categories', async () => {
    // 独立したテスト環境を使用
    const isolatedPath = path.join(os.tmpdir(), `kotori-categories-${Date.now()}`)
    await fs.mkdir(isolatedPath, { recursive: true })

    try {
      const service = new JournalService(isolatedPath)
      await service.initialize()

      // Check default categories
      const initialCategories = service.getCategories()
      expect(initialCategories).toContain('仕事')
      expect(initialCategories).toContain('プライベート')
      expect(initialCategories).toContain('未分類')

      // Add new category
      const addResult = await service.addCategory('学習')
      expect(addResult).toBe(true)

      const updatedCategories = service.getCategories()
      expect(updatedCategories).toContain('学習')

      // Try to add duplicate category
      const duplicateResult = await service.addCategory('学習')
      expect(duplicateResult).toBe(false)

      // Remove category
      const removeResult = await service.removeCategory('学習')
      expect(removeResult).toBe(true)

      // Try to remove default category
      const removeDefaultResult = await service.removeCategory('仕事')
      expect(removeDefaultResult).toBe(false)
    } finally {
      try {
        await fs.rm(isolatedPath, { recursive: true, force: true })
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  it('should generate daily report', async () => {
    // 独立したテスト環境を使用
    const isolatedPath = path.join(os.tmpdir(), `kotori-report-${Date.now()}`)
    await fs.mkdir(isolatedPath, { recursive: true })

    try {
      const service = new JournalService(isolatedPath)
      await service.initialize()

      const testDate = new Date('2025-01-11')

      // Add entries for the test date
      const entry1 = await service.addEntry('テストエントリー1', '仕事')
      const entry2 = await service.addEntry('テストエントリー2', 'プライベート')

      // Manually set timestamps to test date
      entry1.timestamp = testDate
      entry2.timestamp = testDate

      // Generate daily report
      await service.generateDailyReport(testDate)

      // Check if report file was created
      const reportPath = path.join(isolatedPath, '2025', '01', '11.md')
      const reportExists = await fs
        .access(reportPath)
        .then(() => true)
        .catch(() => false)
      expect(reportExists).toBe(true)

      // Check report content
      const reportContent = await fs.readFile(reportPath, 'utf-8')
      expect(reportContent).toContain('# 2025年01月11日の記録')
      expect(reportContent).toContain('## 仕事')
      expect(reportContent).toContain('## プライベート')
      expect(reportContent).toContain('テストエントリー1')
      expect(reportContent).toContain('テストエントリー2')
    } finally {
      try {
        await fs.rm(isolatedPath, { recursive: true, force: true })
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  it('should handle temporary storage and recovery', async () => {
    // 独立したテスト環境を使用
    const isolatedPath = path.join(os.tmpdir(), `kotori-recovery-${Date.now()}`)
    await fs.mkdir(isolatedPath, { recursive: true })

    try {
      // Add entry (should be saved to temp)
      const service = new JournalService(isolatedPath)
      await service.initialize()
      const entry = await service.addEntry('一時保存テスト', '仕事')
      expect(entry.content).toBe('一時保存テスト')

      // Create new service instance to test recovery
      const newJournalService = new JournalService(isolatedPath)
      await newJournalService.initialize()

      // Should recover the entry
      const recoveredEntries = newJournalService.getEntries()
      expect(recoveredEntries).toHaveLength(1)
      expect(recoveredEntries[0].content).toBe('一時保存テスト')
    } finally {
      try {
        await fs.rm(isolatedPath, { recursive: true, force: true })
      } catch {
        // Ignore cleanup errors
      }
    }
  })
})
