import { describe, it, expect, beforeEach } from 'vitest'
import { CategoryManager } from '../../src/models/category'

describe('CategoryManager', () => {
  let categoryManager: CategoryManager

  beforeEach(() => {
    categoryManager = new CategoryManager()
  })

  describe('initialization', () => {
    it('should have default categories', () => {
      const categories = categoryManager.getCategories()
      
      expect(categories).toContain('仕事')
      expect(categories).toContain('プライベート')
      expect(categories).toContain('未分類')
    })
  })

  describe('addCategory', () => {
    it('should add a new category', () => {
      const result = categoryManager.addCategory('学習')
      
      expect(result).toBe(true)
      expect(categoryManager.getCategories()).toContain('学習')
    })

    it('should not add duplicate categories', () => {
      categoryManager.addCategory('学習')
      const result = categoryManager.addCategory('学習')
      
      expect(result).toBe(false)
      const categories = categoryManager.getCategories()
      expect(categories.filter(c => c === '学習')).toHaveLength(1)
    })

    it('should trim whitespace from category names', () => {
      categoryManager.addCategory('  学習  ')
      
      expect(categoryManager.getCategories()).toContain('学習')
      expect(categoryManager.getCategories()).not.toContain('  学習  ')
    })

    it('should not add empty categories', () => {
      const result = categoryManager.addCategory('')
      
      expect(result).toBe(false)
    })
  })

  describe('removeCategory', () => {
    it('should remove an existing category', () => {
      categoryManager.addCategory('学習')
      const result = categoryManager.removeCategory('学習')
      
      expect(result).toBe(true)
      expect(categoryManager.getCategories()).not.toContain('学習')
    })

    it('should not remove default categories', () => {
      const result = categoryManager.removeCategory('仕事')
      
      expect(result).toBe(false)
      expect(categoryManager.getCategories()).toContain('仕事')
    })

    it('should return false when removing non-existent category', () => {
      const result = categoryManager.removeCategory('存在しない')
      
      expect(result).toBe(false)
    })
  })

  describe('isValidCategory', () => {
    it('should validate existing categories', () => {
      expect(categoryManager.isValidCategory('仕事')).toBe(true)
      expect(categoryManager.isValidCategory('プライベート')).toBe(true)
    })

    it('should invalidate non-existent categories', () => {
      expect(categoryManager.isValidCategory('存在しない')).toBe(false)
    })
  })

  describe('toJSON/fromJSON', () => {
    it('should serialize and deserialize categories', () => {
      categoryManager.addCategory('学習')
      categoryManager.addCategory('趣味')
      
      const json = categoryManager.toJSON()
      const newManager = CategoryManager.fromJSON(json)
      
      expect(newManager.getCategories()).toEqual(categoryManager.getCategories())
    })
  })
})