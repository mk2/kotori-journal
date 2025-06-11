import { describe, it, expect, beforeEach } from 'vitest'
import { Journal, JournalEntry } from '../../src/models/journal'

describe('Journal', () => {
  let journal: Journal

  beforeEach(() => {
    journal = new Journal()
  })

  describe('addEntry', () => {
    it('should add a new journal entry', () => {
      const content = '今日は新しいプロジェクトを開始した'
      const category = '仕事'
      
      const entry = journal.addEntry(content, category)
      
      expect(entry).toBeDefined()
      expect(entry.id).toBeDefined()
      expect(entry.content).toBe(content)
      expect(entry.category).toBe(category)
      expect(entry.timestamp).toBeInstanceOf(Date)
    })

    it('should use default category when not specified', () => {
      const content = 'テストエントリー'
      
      const entry = journal.addEntry(content)
      
      expect(entry.category).toBe('未分類')
    })

    it('should generate unique IDs for each entry', () => {
      const entry1 = journal.addEntry('エントリー1')
      const entry2 = journal.addEntry('エントリー2')
      
      expect(entry1.id).not.toBe(entry2.id)
    })
  })

  describe('getEntries', () => {
    it('should return all entries', () => {
      journal.addEntry('エントリー1', '仕事')
      journal.addEntry('エントリー2', 'プライベート')
      journal.addEntry('エントリー3', '仕事')
      
      const entries = journal.getEntries()
      
      expect(entries).toHaveLength(3)
    })

    it('should return entries filtered by date', () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      journal.addEntry('今日のエントリー', '仕事')
      
      const todayEntries = journal.getEntriesByDate(today)
      const yesterdayEntries = journal.getEntriesByDate(yesterday)
      
      expect(todayEntries).toHaveLength(1)
      expect(yesterdayEntries).toHaveLength(0)
    })

    it('should return entries filtered by category', () => {
      journal.addEntry('仕事エントリー1', '仕事')
      journal.addEntry('プライベートエントリー', 'プライベート')
      journal.addEntry('仕事エントリー2', '仕事')
      
      const workEntries = journal.getEntriesByCategory('仕事')
      const privateEntries = journal.getEntriesByCategory('プライベート')
      
      expect(workEntries).toHaveLength(2)
      expect(privateEntries).toHaveLength(1)
    })
  })

  describe('searchEntries', () => {
    it('should search entries by keyword', () => {
      journal.addEntry('TypeScriptの学習を開始した', '学習')
      journal.addEntry('Reactのチュートリアルを完了', '学習')
      journal.addEntry('今日は散歩に行った', 'プライベート')
      
      const results = journal.searchEntries('学習')
      
      expect(results).toHaveLength(2)
      expect(results[0].content).toContain('学習')
    })

    it('should return empty array when no matches found', () => {
      journal.addEntry('今日の出来事', 'プライベート')
      
      const results = journal.searchEntries('存在しないキーワード')
      
      expect(results).toHaveLength(0)
    })
  })
})

describe('JournalEntry', () => {
  it('should create a valid journal entry', () => {
    const content = 'テストコンテンツ'
    const category = 'テスト'
    const timestamp = new Date()
    
    const entry: JournalEntry = {
      id: '123',
      content,
      category,
      timestamp
    }
    
    expect(entry.id).toBe('123')
    expect(entry.content).toBe(content)
    expect(entry.category).toBe(category)
    expect(entry.timestamp).toBe(timestamp)
  })
})