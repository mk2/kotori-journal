import { ContentPattern } from '../types/content-processing.js'

export class ContentPatternManager {
  private patterns: ContentPattern[] = []

  addPattern(
    name: string,
    urlPattern: string,
    prompt: string,
    enabled: boolean = true
  ): ContentPattern {
    const pattern: ContentPattern = {
      id: this.generateId(),
      name,
      urlPattern,
      prompt,
      enabled,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.patterns.push(pattern)
    return pattern
  }

  updatePattern(id: string, updates: Partial<Omit<ContentPattern, 'id' | 'createdAt'>>): boolean {
    const index = this.patterns.findIndex(p => p.id === id)
    if (index !== -1) {
      this.patterns[index] = {
        ...this.patterns[index],
        ...updates,
        updatedAt: new Date(),
      }
      return true
    }
    return false
  }

  removePattern(id: string): boolean {
    const index = this.patterns.findIndex(p => p.id === id)
    if (index !== -1) {
      this.patterns.splice(index, 1)
      return true
    }
    return false
  }

  getPatterns(): ContentPattern[] {
    return [...this.patterns]
  }

  getEnabledPatterns(): ContentPattern[] {
    return this.patterns.filter(p => p.enabled)
  }

  getPatternById(id: string): ContentPattern | undefined {
    return this.patterns.find(p => p.id === id)
  }

  findMatchingPatterns(url: string): ContentPattern[] {
    return this.patterns.filter(pattern => {
      if (!pattern.enabled) return false

      try {
        const regex = new RegExp(pattern.urlPattern)
        return regex.test(url)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Invalid regex pattern: ${pattern.urlPattern}`, error)
        return false
      }
    })
  }

  // Import patterns from plain object (for loading from storage)
  importPatterns(patterns: ContentPattern[]): void {
    this.patterns = patterns.map(p => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
    }))
  }

  private generateId(): string {
    return `pattern-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }
}
