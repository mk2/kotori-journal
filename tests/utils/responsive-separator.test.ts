import { describe, it, expect } from 'vitest'
import { generateSeparator } from '../../src/utils/responsive-separator'

describe('Responsive Separator', () => {
  describe('generateSeparator', () => {
    it('should generate separator with default character for normal width', () => {
      const result = generateSeparator(50)

      expect(result).toBe('─'.repeat(50))
      expect(result.length).toBe(50)
    })

    it('should respect maximum width limit', () => {
      const result = generateSeparator(120, { maxWidth: 80 })

      expect(result).toBe('─'.repeat(80))
      expect(result.length).toBe(80)
    })

    it('should respect minimum width limit', () => {
      const result = generateSeparator(5, { minWidth: 20 })

      expect(result).toBe('─'.repeat(20))
      expect(result.length).toBe(20)
    })

    it('should handle very narrow screens gracefully', () => {
      const result = generateSeparator(1)

      expect(result).toBe('─')
      expect(result.length).toBe(1)
    })

    it('should allow custom separator character', () => {
      const result = generateSeparator(10, { character: '=' })

      expect(result).toBe('='.repeat(10))
      expect(result.length).toBe(10)
    })

    it('should use default options when not provided', () => {
      const result = generateSeparator(30)

      expect(result).toBe('─'.repeat(30))
      expect(result.length).toBe(30)
    })

    it('should handle edge case of zero width', () => {
      const result = generateSeparator(0)

      expect(result).toBe('')
      expect(result.length).toBe(0)
    })

    it('should handle negative width by returning empty string', () => {
      const result = generateSeparator(-5)

      expect(result).toBe('')
      expect(result.length).toBe(0)
    })

    it('should apply both min and max constraints correctly', () => {
      const veryNarrow = generateSeparator(5, { minWidth: 20, maxWidth: 80 })
      const veryWide = generateSeparator(100, { minWidth: 20, maxWidth: 80 })

      expect(veryNarrow.length).toBe(20)
      expect(veryWide.length).toBe(80)
    })

    it('should handle case where minWidth is greater than maxWidth', () => {
      const result = generateSeparator(50, { minWidth: 80, maxWidth: 60 })

      // Should use maxWidth when minWidth > maxWidth
      expect(result.length).toBe(60)
    })
  })
})
