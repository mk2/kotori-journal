import { promises as fs } from 'fs'
import path from 'path'
import { ContentPatternManager } from '../models/content-pattern.js'
import { ContentPattern } from '../types/content-processing.js'
import { ensureDirectoryExists } from '../utils/directory.js'

export class ContentPatternStorage {
  private filePath: string

  constructor(dataPath: string) {
    this.filePath = path.join(dataPath, 'content-patterns.json')
  }

  async load(): Promise<ContentPatternManager> {
    const manager = new ContentPatternManager()

    try {
      const data = await fs.readFile(this.filePath, 'utf-8')
      const patterns: ContentPattern[] = JSON.parse(data)
      manager.importPatterns(patterns)
    } catch (error) {
      // ファイルが存在しない場合は空のマネージャーを返す
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        // eslint-disable-next-line no-console
        console.error('Failed to load content patterns:', error)
      }
    }

    return manager
  }

  async save(manager: ContentPatternManager): Promise<void> {
    try {
      const patterns = manager.getPatterns()
      const data = JSON.stringify(patterns, null, 2)
      await fs.writeFile(this.filePath, data, 'utf-8')
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save content patterns:', error)
      throw error
    }
  }

  async ensureDirectoryExists(): Promise<void> {
    const dir = path.dirname(this.filePath)
    try {
      await ensureDirectoryExists(dir)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to create directory:', error)
      throw error
    }
  }
}
