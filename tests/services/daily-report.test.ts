import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DailyReportService } from '../../src/services/daily-report'
import { JournalService } from '../../src/services/journal-service'
import { JournalEntry } from '../../src/models/journal'

vi.mock('../../src/services/journal-service')

describe('DailyReportService', () => {
  let reportService: DailyReportService
  let mockJournalService: any
  const testDataPath = '/test/kotori-journal-data'

  beforeEach(() => {
    vi.useFakeTimers()
    mockJournalService = {
      getEntriesByDate: vi.fn(),
      generateDailyReport: vi.fn()
    }
    reportService = new DailyReportService(mockJournalService, testDataPath)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkAndGeneratePreviousDayReport', () => {
    it('should generate report for previous day on first run of the day', async () => {
      const today = new Date('2025-01-12T08:00:00')
      const yesterday = new Date('2025-01-11T10:00:00')
      
      vi.setSystemTime(today)
      
      const yesterdayEntries: JournalEntry[] = [
        {
          id: '1',
          content: '昨日の仕事',
          category: '仕事',
          timestamp: yesterday
        }
      ]
      
      mockJournalService.getEntriesByDate.mockReturnValue(yesterdayEntries)
      
      await reportService.checkAndGeneratePreviousDayReport()
      
      expect(mockJournalService.getEntriesByDate).toHaveBeenCalledWith(
        expect.objectContaining({
          getDate: expect.any(Function),
          getMonth: expect.any(Function),
          getFullYear: expect.any(Function)
        })
      )
      
      expect(mockJournalService.generateDailyReport).toHaveBeenCalledWith(
        expect.any(Date)
      )
    })

    it('should not generate report if already generated today', async () => {
      const today = new Date('2025-01-12T08:00:00')
      vi.setSystemTime(today)
      
      mockJournalService.getEntriesByDate.mockReturnValue([
        { id: '1', content: 'test', category: 'test', timestamp: new Date() }
      ])
      
      await reportService.checkAndGeneratePreviousDayReport()
      mockJournalService.generateDailyReport.mockClear()
      mockJournalService.getEntriesByDate.mockClear()
      
      await reportService.checkAndGeneratePreviousDayReport()
      
      expect(mockJournalService.generateDailyReport).not.toHaveBeenCalled()
      expect(mockJournalService.getEntriesByDate).not.toHaveBeenCalled()
    })

    it('should not generate report if no entries for previous day', async () => {
      const today = new Date('2025-01-12T08:00:00')
      vi.setSystemTime(today)
      
      mockJournalService.getEntriesByDate.mockReturnValue([])
      
      await reportService.checkAndGeneratePreviousDayReport()
      
      expect(mockJournalService.generateDailyReport).not.toHaveBeenCalled()
    })
  })

  describe('shouldGenerateReport', () => {
    it('should return true on first run of a new day', () => {
      const lastCheck = new Date('2025-01-11T23:59:59')
      const now = new Date('2025-01-12T00:00:01')
      
      vi.setSystemTime(now)
      reportService.setLastCheck(lastCheck)
      
      expect(reportService.shouldGenerateReport()).toBe(true)
    })

    it('should return false if already checked today', () => {
      const lastCheck = new Date('2025-01-12T08:00:00')
      const now = new Date('2025-01-12T10:00:00')
      
      vi.setSystemTime(now)
      reportService.setLastCheck(lastCheck)
      
      expect(reportService.shouldGenerateReport()).toBe(false)
    })
  })

  describe('getLastReportGenerationTime', () => {
    it('should track last report generation time', async () => {
      const mockDate = new Date('2025-01-12T08:00:00')
      vi.setSystemTime(mockDate)
      
      mockJournalService.getEntriesByDate.mockReturnValue([
        { id: '1', content: 'test', category: 'test', timestamp: new Date() }
      ])
      
      await reportService.checkAndGeneratePreviousDayReport()
      
      const lastTime = reportService.getLastReportGenerationTime()
      expect(lastTime).toEqual(mockDate)
    })
  })
})