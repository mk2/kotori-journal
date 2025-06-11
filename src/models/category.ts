export class CategoryManager {
  private categories: Set<string>
  private defaultCategories: Set<string>

  constructor() {
    this.defaultCategories = new Set(['仕事', 'プライベート', '未分類'])
    this.categories = new Set(this.defaultCategories)
  }

  getCategories(): string[] {
    return Array.from(this.categories).sort()
  }

  addCategory(name: string): boolean {
    const trimmedName = name.trim()
    
    if (!trimmedName) {
      return false
    }
    
    if (this.categories.has(trimmedName)) {
      return false
    }
    
    this.categories.add(trimmedName)
    return true
  }

  removeCategory(name: string): boolean {
    if (this.defaultCategories.has(name)) {
      return false
    }
    
    return this.categories.delete(name)
  }

  isValidCategory(name: string): boolean {
    return this.categories.has(name)
  }

  toJSON(): string[] {
    return Array.from(this.categories)
  }

  static fromJSON(data: string[]): CategoryManager {
    const manager = new CategoryManager()
    
    for (const category of data) {
      if (!manager.defaultCategories.has(category)) {
        manager.categories.add(category)
      }
    }
    
    return manager
  }
}