export interface JournalEntry {
  id: string
  content: string
  category: string
  timestamp: Date
}

export class Journal {
  private entries: JournalEntry[] = []

  addEntry(content: string, category: string = '未分類'): JournalEntry {
    const entry: JournalEntry = {
      id: this.generateId(),
      content,
      category,
      timestamp: new Date()
    }
    
    this.entries.push(entry)
    return entry
  }

  getEntries(): JournalEntry[] {
    return [...this.entries]
  }

  getEntriesByDate(date: Date): JournalEntry[] {
    const targetDate = this.normalizeDate(date)
    
    return this.entries.filter(entry => {
      const entryDate = this.normalizeDate(entry.timestamp)
      return entryDate.getTime() === targetDate.getTime()
    })
  }

  getEntriesByCategory(category: string): JournalEntry[] {
    return this.entries.filter(entry => entry.category === category)
  }

  searchEntries(keyword: string): JournalEntry[] {
    const lowerKeyword = keyword.toLowerCase()
    return this.entries.filter(entry => 
      entry.content.toLowerCase().includes(lowerKeyword) ||
      entry.category.toLowerCase().includes(lowerKeyword)
    )
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private normalizeDate(date: Date): Date {
    const normalized = new Date(date)
    normalized.setHours(0, 0, 0, 0)
    return normalized
  }
}