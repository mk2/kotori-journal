import { Journal, JournalEntry } from '../models/journal'
import { StorageService } from './storage'
import { CategoryManager } from '../models/category'
import { CategoryStorage } from './category-storage'
import { DailyReportService } from './daily-report'
import { ClaudeAIService } from './claude-ai'

export class JournalService {
  private journal: Journal
  private storage: StorageService
  private categoryManager: CategoryManager
  private categoryStorage: CategoryStorage
  private dailyReportService: DailyReportService
  private claudeAI?: ClaudeAIService

  constructor(dataPath: string) {
    this.journal = new Journal()
    this.storage = new StorageService(dataPath)
    this.categoryStorage = new CategoryStorage(dataPath)
    this.categoryManager = new CategoryManager()
    this.dailyReportService = new DailyReportService(this, dataPath)
    
    // Claude AIサービスは環境変数がある場合のみ初期化
    try {
      this.claudeAI = new ClaudeAIService()
    } catch (error) {
      // API キーがない場合は無視（AIなしで動作）
      this.claudeAI = undefined
    }
  }

  async initialize(): Promise<void> {
    this.categoryManager = await this.categoryStorage.load()
    
    const tempEntries = await this.storage.loadTempEntries()
    
    // 一時エントリーをメモリに復元（元のIDとタイムスタンプを保持）
    for (const entry of tempEntries) {
      this.journal.addExistingEntry(entry)
    }
    
    // 前日の日報生成をチェック（前日のエントリーのみ対象）
    await this.dailyReportService.checkAndGeneratePreviousDayReport()
    
    // 前日のエントリーのみ一時ファイルから削除
    await this.clearPreviousDayTempEntries(tempEntries)
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

  // AI機能
  isAIAvailable(): boolean {
    return this.claudeAI !== undefined
  }

  isAITrigger(text: string): boolean {
    return this.claudeAI?.isAITrigger(text) ?? false
  }

  async processAIRequest(text: string): Promise<string> {
    if (!this.claudeAI) {
      throw new Error('Claude AI is not available. Please set ANTHROPIC_API_KEY environment variable.')
    }
    
    // 今日のエントリーを取得
    const today = new Date()
    const todayEntries = this.journal.getEntriesByDate(today)
    
    return this.claudeAI.processAIRequest(text, todayEntries)
  }

  private async clearPreviousDayTempEntries(tempEntries: JournalEntry[]): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // 前日以前のエントリーIDを収集
    const previousDayEntryIds = tempEntries
      .filter(entry => {
        const entryDate = new Date(entry.timestamp)
        entryDate.setHours(0, 0, 0, 0)
        return entryDate < today
      })
      .map(entry => entry.id)
    
    // 前日以前のエントリーのみ一時ファイルから削除
    if (previousDayEntryIds.length > 0) {
      await this.storage.clearSpecificTempEntries(previousDayEntryIds)
    }
  }
}