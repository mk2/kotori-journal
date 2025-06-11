import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SearchService } from '../../src/services/search-service'
import { JournalService } from '../../src/services/journal-service'
import { JournalEntry } from '../../src/models/journal'

vi.mock('../../src/services/journal-service')

describe('SearchService', () => {
  let searchService: SearchService
  let mockJournalService: any

  beforeEach(() => {
    mockJournalService = {
      searchEntries: vi.fn(),
      searchReports: vi.fn(),
      getEntriesByDate: vi.fn()
    }
    searchService = new SearchService(mockJournalService)
  })

  describe('searchByKeyword', () => {
    it('should search both entries and reports', async () => {
      const keyword = 'TypeScript'
      
      const mockEntries: JournalEntry[] = [
        {
          id: '1',
          content: 'TypeScriptの学習を開始',
          category: '学習',
          timestamp: new Date()
        }
      ]
      
      const mockReports = [
        {
          date: '2025-01-10',
          content: 'TypeScriptプロジェクト完了',
          matches: ['TypeScriptプロジェクト完了']
        }
      ]
      
      mockJournalService.searchEntries.mockReturnValue(mockEntries)
      mockJournalService.searchReports.mockResolvedValue(mockReports)
      
      const results = await searchService.searchByKeyword(keyword)
      
      expect(results.currentEntries).toEqual(mockEntries)
      expect(results.reports).toEqual(mockReports)
      expect(mockJournalService.searchEntries).toHaveBeenCalledWith(keyword)
      expect(mockJournalService.searchReports).toHaveBeenCalledWith(keyword)
    })

    it('should handle empty results', async () => {
      mockJournalService.searchEntries.mockReturnValue([])
      mockJournalService.searchReports.mockResolvedValue([])
      
      const results = await searchService.searchByKeyword('存在しない')
      
      expect(results.currentEntries).toHaveLength(0)
      expect(results.reports).toHaveLength(0)
    })
  })

  describe('searchByDate', () => {
    it('should search entries by specific date', () => {
      const date = new Date('2025-01-11')
      const mockEntries: JournalEntry[] = [
        {
          id: '1',
          content: 'その日のエントリー',
          category: '仕事',
          timestamp: date
        }
      ]
      
      mockJournalService.getEntriesByDate.mockReturnValue(mockEntries)
      
      const results = searchService.searchByDate(date)
      
      expect(results).toEqual(mockEntries)
      expect(mockJournalService.getEntriesByDate).toHaveBeenCalledWith(date)
    })
  })

  describe('searchByDateRange', () => {
    it('should search entries within date range', () => {
      const startDate = new Date('2025-01-10')
      const endDate = new Date('2025-01-12')
      
      const allEntries: JournalEntry[] = [
        {
          id: '1',
          content: 'Before range',
          category: '仕事',
          timestamp: new Date('2025-01-09')
        },
        {
          id: '2',
          content: 'In range 1',
          category: '仕事',
          timestamp: new Date('2025-01-10T10:00:00')
        },
        {
          id: '3',
          content: 'In range 2',
          category: '仕事',
          timestamp: new Date('2025-01-11')
        },
        {
          id: '4',
          content: 'After range',
          category: '仕事',
          timestamp: new Date('2025-01-13')
        }
      ]
      
      mockJournalService.getEntriesByDate
        .mockReturnValueOnce([allEntries[1]]) // Jan 10
        .mockReturnValueOnce([allEntries[2]]) // Jan 11
        .mockReturnValueOnce([])              // Jan 12
      
      const results = searchService.searchByDateRange(startDate, endDate)
      
      expect(results).toHaveLength(2)
      expect(results[0].content).toBe('In range 1')
      expect(results[1].content).toBe('In range 2')
    })
  })

  describe('getRecentEntries', () => {
    it('should return recent entries up to limit', () => {
      const entries: JournalEntry[] = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        content: `Entry ${i}`,
        category: '仕事',
        timestamp: new Date(Date.now() - i * 60000) // 1 minute apart
      }))
      
      mockJournalService.searchEntries.mockReturnValue(entries)
      
      const results = searchService.getRecentEntries(5)
      
      expect(results).toHaveLength(5)
      expect(results[0].id).toBe('0')
    })
  })
})