import { describe, it, expect, beforeEach } from 'vitest'
import { ContentPatternManager } from '../src/models/content-pattern'
import { JournalService } from '../src/services/journal-service'
import path from 'path'
import { promises as fs } from 'fs'
import os from 'os'

describe('Content Processing', () => {
  let patternManager: ContentPatternManager
  let tempDir: string

  beforeEach(async () => {
    patternManager = new ContentPatternManager()

    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kotori-test-'))
  })

  describe('ContentPatternManager', () => {
    it('should add and retrieve patterns', () => {
      const pattern = patternManager.addPattern(
        'Test Pattern',
        'https://example\\.com/.*',
        'Summarize this content: {content}',
        true
      )

      expect(pattern.name).toBe('Test Pattern')
      expect(pattern.urlPattern).toBe('https://example\\.com/.*')
      expect(pattern.enabled).toBe(true)

      const patterns = patternManager.getPatterns()
      expect(patterns).toHaveLength(1)
      expect(patterns[0].id).toBe(pattern.id)
    })

    it('should find matching patterns by URL', () => {
      patternManager.addPattern('Test Pattern 1', 'https://example\\.com/.*', 'Test prompt 1')
      patternManager.addPattern('Test Pattern 2', 'https://test\\.com/.*', 'Test prompt 2')
      patternManager.addPattern(
        'Disabled Pattern',
        'https://example\\.com/.*',
        'Test prompt 3',
        false
      )

      const matches = patternManager.findMatchingPatterns('https://example.com/page')
      expect(matches).toHaveLength(1)
      expect(matches[0].name).toBe('Test Pattern 1')
    })

    it('should update pattern properties', () => {
      const pattern = patternManager.addPattern('Original Name', 'test-pattern', 'test prompt')

      const success = patternManager.updatePattern(pattern.id, {
        name: 'Updated Name',
        enabled: false,
      })

      expect(success).toBe(true)

      const updated = patternManager.getPatternById(pattern.id)
      expect(updated?.name).toBe('Updated Name')
      expect(updated?.enabled).toBe(false)
      expect(updated?.urlPattern).toBe('test-pattern') // Should remain unchanged
    })

    it('should remove patterns', () => {
      const pattern = patternManager.addPattern('Test Pattern', 'test-pattern', 'test prompt')

      expect(patternManager.getPatterns()).toHaveLength(1)

      const success = patternManager.removePattern(pattern.id)
      expect(success).toBe(true)
      expect(patternManager.getPatterns()).toHaveLength(0)
    })
  })

  describe('Content Processing Integration', () => {
    it('should handle missing Claude AI gracefully', async () => {
      // This test verifies that the system works without Claude AI
      const journalService = new JournalService(tempDir)
      await journalService.initialize()

      const contentProcessor = journalService.getContentProcessor()

      // Should be undefined when Claude AI is not available
      expect(contentProcessor).toBeUndefined()
    })
  })
})
