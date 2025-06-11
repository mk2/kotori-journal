import { JournalService } from './journal-service'

export class DailyReportService {
  private lastCheckDate: Date | null = null
  private lastReportGenerationTime: Date | null = null

  constructor(
    private journalService: JournalService,
    private dataPath: string
  ) {}

  async checkAndGeneratePreviousDayReport(): Promise<void> {
    if (!this.shouldGenerateReport()) {
      return
    }

    const yesterday = this.getYesterday()
    const entries = this.journalService.getEntriesByDate(yesterday)

    if (entries.length > 0) {
      await this.journalService.generateDailyReport(yesterday)
      this.lastReportGenerationTime = new Date()
    }

    this.lastCheckDate = new Date()
  }

  shouldGenerateReport(): boolean {
    if (!this.lastCheckDate) {
      return true
    }

    const now = new Date()
    return (
      now.getDate() !== this.lastCheckDate.getDate() ||
      now.getMonth() !== this.lastCheckDate.getMonth() ||
      now.getFullYear() !== this.lastCheckDate.getFullYear()
    )
  }

  setLastCheck(date: Date): void {
    this.lastCheckDate = date
  }

  getLastReportGenerationTime(): Date | null {
    return this.lastReportGenerationTime
  }

  private getYesterday(): Date {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday
  }
}