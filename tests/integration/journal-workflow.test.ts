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
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  it('should handle complete journal workflow', async () => {
    // Add entries
    const entry1 = await journalService.addEntry('朝の会議に参加', '仕事')
    const entry2 = await journalService.addEntry('ランチを食べた', 'プライベート')
    
    expect(entry1.content).toBe('朝の会議に参加')
    expect(entry1.category).toBe('仕事')
    expect(entry2.content).toBe('ランチを食べた')
    expect(entry2.category).toBe('プライベート')

    // Get all entries
    const allEntries = journalService.getEntries()
    expect(allEntries).toHaveLength(2)

    // Search entries
    const workEntries = journalService.getEntriesByCategory('仕事')
    expect(workEntries).toHaveLength(1)
    expect(workEntries[0].content).toBe('朝の会議に参加')

    // Search by keyword
    const searchResults = journalService.searchEntries('会議')
    expect(searchResults).toHaveLength(1)
    expect(searchResults[0].content).toBe('朝の会議に参加')
  })

  it('should manage categories', async () => {
    // Check default categories
    const initialCategories = journalService.getCategories()
    expect(initialCategories).toContain('仕事')
    expect(initialCategories).toContain('プライベート')
    expect(initialCategories).toContain('未分類')

    // Add new category
    const addResult = await journalService.addCategory('学習')
    expect(addResult).toBe(true)
    
    const updatedCategories = journalService.getCategories()
    expect(updatedCategories).toContain('学習')

    // Try to add duplicate category
    const duplicateResult = await journalService.addCategory('学習')
    expect(duplicateResult).toBe(false)

    // Remove category
    const removeResult = await journalService.removeCategory('学習')
    expect(removeResult).toBe(true)

    // Try to remove default category
    const removeDefaultResult = await journalService.removeCategory('仕事')
    expect(removeDefaultResult).toBe(false)
  })

  it('should generate daily report', async () => {
    const testDate = new Date('2025-01-11')
    
    // Add entries for the test date
    const entry1 = await journalService.addEntry('テストエントリー1', '仕事')
    const entry2 = await journalService.addEntry('テストエントリー2', 'プライベート')
    
    // Manually set timestamps to test date
    entry1.timestamp = testDate
    entry2.timestamp = testDate

    // Generate daily report
    await journalService.generateDailyReport(testDate)

    // Check if report file was created
    const reportPath = path.join(testDataPath, '2025', '01', '11.md')
    const reportExists = await fs.access(reportPath).then(() => true).catch(() => false)
    expect(reportExists).toBe(true)

    // Check report content
    const reportContent = await fs.readFile(reportPath, 'utf-8')
    expect(reportContent).toContain('# 2025年01月11日の記録')
    expect(reportContent).toContain('## 仕事')
    expect(reportContent).toContain('## プライベート')
    expect(reportContent).toContain('テストエントリー1')
    expect(reportContent).toContain('テストエントリー2')
  })

  it('should handle temporary storage and recovery', async () => {
    // Add entry (should be saved to temp)
    const entry = await journalService.addEntry('一時保存テスト', '仕事')
    expect(entry.content).toBe('一時保存テスト')

    // Create new service instance to test recovery
    const newJournalService = new JournalService(testDataPath)
    await newJournalService.initialize()

    // Should recover the entry
    const recoveredEntries = newJournalService.getEntries()
    expect(recoveredEntries).toHaveLength(1)
    expect(recoveredEntries[0].content).toBe('一時保存テスト')
  })
})