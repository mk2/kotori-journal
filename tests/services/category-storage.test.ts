import { describe, it, expect, beforeEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import { CategoryStorage } from '../../src/services/category-storage'
import { CategoryManager } from '../../src/models/category'

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    access: vi.fn()
  }
}))

describe('CategoryStorage', () => {
  let storage: CategoryStorage
  const testDataPath = '/test/kotori-journal-data'

  beforeEach(() => {
    storage = new CategoryStorage(testDataPath)
    vi.clearAllMocks()
  })

  describe('save', () => {
    it('should save categories to file', async () => {
      const manager = new CategoryManager()
      manager.addCategory('学習')
      
      await storage.save(manager)
      
      expect(fs.mkdir).toHaveBeenCalledWith(testDataPath, { recursive: true })
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(testDataPath, 'categories.json'),
        expect.stringContaining('"学習"')
      )
    })
  })

  describe('load', () => {
    it('should load categories from file', async () => {
      const savedData = JSON.stringify(['仕事', 'プライベート', '未分類', '学習'])
      vi.mocked(fs.access).mockResolvedValue()
      vi.mocked(fs.readFile).mockResolvedValue(savedData)
      
      const manager = await storage.load()
      
      expect(manager.getCategories()).toContain('学習')
    })

    it('should return default manager when file does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
      
      const manager = await storage.load()
      
      expect(manager.getCategories()).toEqual(['プライベート', '仕事', '未分類'])
    })
  })
})