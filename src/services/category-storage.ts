import { promises as fs } from 'fs'
import * as path from 'path'
import { CategoryManager } from '../models/category'
import { ensureDirectoryExists } from '../utils/directory.js'

export class CategoryStorage {
  private filePath: string

  constructor(private dataPath: string) {
    this.filePath = path.join(dataPath, 'categories.json')
  }

  async save(manager: CategoryManager): Promise<void> {
    await ensureDirectoryExists(this.dataPath)
    const data = JSON.stringify(manager.toJSON(), null, 2)
    await fs.writeFile(this.filePath, data)
  }

  async load(): Promise<CategoryManager> {
    try {
      await fs.access(this.filePath)
      const data = await fs.readFile(this.filePath, 'utf-8')
      const categories = JSON.parse(data)
      return CategoryManager.fromJSON(categories)
    } catch {
      return new CategoryManager()
    }
  }
}
