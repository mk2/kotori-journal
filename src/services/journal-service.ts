import { Journal, JournalEntry } from '../models/journal'
import { StorageService } from './storage'
import { CategoryManager } from '../models/category'
import { CategoryStorage } from './category-storage'
import { DailyReportService } from './daily-report'

export class JournalService {
  private journal: Journal
  private storage: StorageService
  private categoryManager: CategoryManager
  private categoryStorage: CategoryStorage
  private dailyReportService: DailyReportService

  constructor(dataPath: string) {
    this.journal = new Journal()
    this.storage = new StorageService(dataPath)
    this.categoryStorage = new CategoryStorage(dataPath)
    this.categoryManager = new CategoryManager()
    this.dailyReportService = new DailyReportService(this, dataPath)
  }

  async initialize(): Promise<void> {
    this.categoryManager = await this.categoryStorage.load()
    
    const tempEntries = await this.storage.loadTempEntries()
    
    for (const entry of tempEntries) {
      this.journal.addEntry(entry.content, entry.category)
    }
    
    await this.dailyReportService.checkAndGeneratePreviousDayReport()
    
    if (tempEntries.length > 0) {
      await this.storage.clearTempEntries()
    }
  }

  async addEntry(content: string, category?: string): Promise<JournalEntry> {
    const entry = this.journal.addEntry(content, category)
    await this.storage.saveEntryToTemp(entry)
    return entry
  }

  getEntries(): JournalEntry[] {
    return this.journal.getEntries()
  }

  getEntriesByDate(date: Date): JournalEntry[] {
    return this.journal.getEntriesByDate(date)
  }

  getEntriesByCategory(category: string): JournalEntry[] {
    return this.journal.getEntriesByCategory(category)
  }

  searchEntries(keyword: string): JournalEntry[] {
    return this.journal.searchEntries(keyword)
  }

  async searchReports(keyword: string) {
    return this.storage.searchReports(keyword)
  }

  async generateDailyReport(date: Date): Promise<void> {
    const entries = this.journal.getEntriesByDate(date)
    await this.storage.generateDailyReport(date, entries)
  }

  getCategories(): string[] {
    return this.categoryManager.getCategories()
  }

  async addCategory(name: string): Promise<boolean> {
    const result = this.categoryManager.addCategory(name)
    if (result) {
      await this.categoryStorage.save(this.categoryManager)
    }
    return result
  }

  async removeCategory(name: string): Promise<boolean> {
    const result = this.categoryManager.removeCategory(name)
    if (result) {
      await this.categoryStorage.save(this.categoryManager)
    }
    return result
  }

  isValidCategory(name: string): boolean {
    return this.categoryManager.isValidCategory(name)
  }
}