import { JournalService } from './journal-service'
import { JournalEntry } from '../models/journal'
import { SearchResult } from './storage'

export interface SearchResults {
  currentEntries: JournalEntry[]
  reports: SearchResult[]
}

export class SearchService {
  constructor(private journalService: JournalService) {}

  async searchByKeyword(keyword: string): Promise<SearchResults> {
    const currentEntries = this.journalService.searchEntries(keyword)
    const reports = await this.journalService.searchReports(keyword)

    return {
      currentEntries,
      reports,
    }
  }

  searchByDate(date: Date): JournalEntry[] {
    return this.journalService.getEntriesByDate(date)
  }

  searchByDateRange(startDate: Date, endDate: Date): JournalEntry[] {
    const results: JournalEntry[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const entries = this.journalService.getEntriesByDate(currentDate)
      results.push(...entries)
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return results
  }

  getRecentEntries(limit: number = 10): JournalEntry[] {
    const allEntries = this.journalService.searchEntries('')
    return allEntries.slice(0, limit)
  }
}
