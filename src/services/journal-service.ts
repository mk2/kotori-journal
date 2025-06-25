import { Journal, JournalEntry } from '../models/journal'
import { StorageService } from './storage'
import { CategoryManager } from '../models/category'
import { CategoryStorage } from './category-storage'
import { DailyReportService } from './daily-report'
import { ClaudeAIService } from './claude-ai'
import { ContentPatternStorage } from './content-pattern-storage.js'
import { ContentPatternManager } from '../models/content-pattern.js'
import { ContentProcessor } from './content-processor.js'

export class JournalService {
  private journal: Journal
  private storage: StorageService
  private categoryManager: CategoryManager
  private categoryStorage: CategoryStorage
  private dailyReportService: DailyReportService
  private claudeAI?: ClaudeAIService
  private patternStorage: ContentPatternStorage
  private patternManager: ContentPatternManager
  private contentProcessor?: ContentProcessor

  constructor(dataPath: string) {
    this.journal = new Journal()
    this.storage = new StorageService(dataPath)
    this.categoryStorage = new CategoryStorage(dataPath)
    this.categoryManager = new CategoryManager()
    this.dailyReportService = new DailyReportService(this, dataPath)
    this.patternStorage = new ContentPatternStorage(dataPath)
    this.patternManager = new ContentPatternManager()

    // Claude AIサービスは環境変数がある場合のみ初期化
    try {
      this.claudeAI = new ClaudeAIService()
      // ContentProcessorはClaude AIが利用可能な場合のみ初期化
      this.contentProcessor = new ContentProcessor(this, this.patternManager, undefined)
    } catch {
      // API キーがない場合は無視（AIなしで動作）
      this.claudeAI = undefined
      this.contentProcessor = undefined
    }
  }

  async initialize(): Promise<void> {
    this.categoryManager = await this.categoryStorage.load()

    // パターンマネージャーを初期化
    await this.patternStorage.ensureDirectoryExists()
    this.patternManager = await this.patternStorage.load()

    // ContentProcessorを再初期化（patternManagerが読み込まれた後）
    if (this.claudeAI) {
      this.contentProcessor = new ContentProcessor(this, this.patternManager, undefined)
    }

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

  async addEntry(
    content: string,
    category?: string,
    type: 'entry' | 'ai_question' | 'ai_response' = 'entry',
    metadata?: Record<string, unknown>
  ): Promise<JournalEntry> {
    const entry = this.journal.addEntry(content, category, type, metadata)
    await this.storage.saveEntryToTemp(entry)
    return entry
  }

  async updateEntry(entryId: string, updates: Partial<JournalEntry>): Promise<boolean> {
    const success = this.journal.updateEntry(entryId, updates)
    if (success) {
      // Find the updated entry and save it to temp storage
      const updatedEntry = this.journal.getEntries().find(e => e.id === entryId)
      if (updatedEntry) {
        await this.storage.saveEntryToTemp(updatedEntry)
      }
    }
    return success
  }

  getEntryById(entryId: string): JournalEntry | undefined {
    return this.journal.getEntries().find(e => e.id === entryId)
  }

  getEntries(): JournalEntry[] {
    return this.journal.getEntries()
  }

  getEntriesByDate(date: Date): JournalEntry[] {
    return this.journal.getEntriesByDate(date)
  }

  getJournalEntriesByDate(date: Date): JournalEntry[] {
    return this.journal.getJournalEntriesByDate(date)
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
    const entries = this.journal.getJournalEntriesByDate(date)
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

  async processAIRequest(
    text: string
  ): Promise<{ question: JournalEntry; response: JournalEntry }> {
    if (!this.claudeAI) {
      throw new Error(
        'Claude AI is not available. Please set ANTHROPIC_API_KEY environment variable.'
      )
    }

    // AI質問を履歴に追加
    const questionEntry = await this.addEntry(text, 'AI', 'ai_question')

    // 今日のジャーナルエントリーのみを取得（AI会話は除く）
    const today = new Date()
    const todayJournalEntries = this.journal.getJournalEntriesByDate(today)

    const response = await this.claudeAI.processAIRequest(text, todayJournalEntries)

    // AI応答を履歴に追加
    const responseEntry = await this.addEntry(response, 'AI', 'ai_response')

    return { question: questionEntry, response: responseEntry }
  }

  // UIから直接Claude AIにアクセスするためのメソッド
  async generateAIResponse(
    text: string,
    journalEntries: JournalEntry[],
    skipTriggerCheck = false
  ): Promise<string> {
    if (!this.claudeAI) {
      throw new Error(
        'Claude AI is not available. Please set ANTHROPIC_API_KEY environment variable.'
      )
    }

    return await this.claudeAI.processAIRequest(text, journalEntries, skipTriggerCheck)
  }

  // Content processing methods
  async savePatterns(): Promise<void> {
    await this.patternStorage.save(this.patternManager)
  }

  getPatternManager(): ContentPatternManager {
    return this.patternManager
  }

  getContentProcessor(): ContentProcessor | undefined {
    return this.contentProcessor
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
