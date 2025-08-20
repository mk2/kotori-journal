import { describe, it, expect, beforeEach } from 'vitest'
import { Journal } from '../../src/models/journal'

describe('Journal - Image Support', () => {
  let journal: Journal

  beforeEach(() => {
    journal = new Journal()
  })

  describe('image entries', () => {
    it('should add image entry with metadata', () => {
      const imageMetadata = {
        imagePath: 'images/1234567890-abc123.png',
        imageFormat: 'png',
        imageSize: 1024,
        originalFileName: 'screenshot.png',
      }

      const entry = journal.addEntry(
        '[Image] Screenshot from today',
        '仕事',
        'image' as any, // Test will validate this extension
        imageMetadata
      )

      expect(entry).toBeDefined()
      expect(entry.id).toBeDefined()
      expect(entry.content).toBe('[Image] Screenshot from today')
      expect(entry.category).toBe('仕事')
      expect(entry.type).toBe('image')
      expect(entry.metadata).toEqual(imageMetadata)
      expect(entry.timestamp).toBeInstanceOf(Date)
    })

    it('should add image entry with minimal content', () => {
      const imageMetadata = {
        imagePath: 'images/1234567890-def456.jpg',
        imageFormat: 'jpeg',
        imageSize: 2048,
      }

      const entry = journal.addEntry('[Image]', '未分類', 'image' as any, imageMetadata)

      expect(entry.content).toBe('[Image]')
      expect(entry.metadata?.imagePath).toBe('images/1234567890-def456.jpg')
      expect(entry.metadata?.imageFormat).toBe('jpeg')
      expect(entry.metadata?.imageSize).toBe(2048)
    })

    it('should retrieve image entries by date', () => {
      const today = new Date()
      const imageMetadata = {
        imagePath: 'images/test.png',
        imageFormat: 'png',
        imageSize: 1024,
      }

      // Add image entry
      journal.addEntry('[Image] Test image', '仕事', 'image' as any, imageMetadata)

      // Add regular entry
      journal.addEntry('Regular text entry', '仕事')

      const todayEntries = journal.getEntriesByDate(today)
      expect(todayEntries).toHaveLength(2)

      const imageEntry = todayEntries.find(e => e.type === 'image')
      expect(imageEntry).toBeDefined()
      expect(imageEntry?.metadata?.imagePath).toBe('images/test.png')
    })

    it('should retrieve only journal entries (excluding images) by date', () => {
      const today = new Date()
      const imageMetadata = {
        imagePath: 'images/test.png',
        imageFormat: 'png',
        imageSize: 1024,
      }

      // Add image entry
      journal.addEntry('[Image] Test image', '仕事', 'image' as any, imageMetadata)

      // Add regular entry
      journal.addEntry('Regular text entry', '仕事')

      const journalEntries = journal.getJournalEntriesByDate(today)
      expect(journalEntries).toHaveLength(1)
      expect(journalEntries[0].content).toBe('Regular text entry')
      expect(journalEntries[0].type).toBe('entry') // default type is 'entry'
    })

    it('should search image entries by content', () => {
      const imageMetadata = {
        imagePath: 'images/screenshot.png',
        imageFormat: 'png',
        imageSize: 1024,
      }

      journal.addEntry('[Image] Meeting screenshot', '仕事', 'image' as any, imageMetadata)
      journal.addEntry('Regular meeting notes', '仕事')

      const searchResults = journal.searchEntries('screenshot')
      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].type).toBe('image')
      expect(searchResults[0].content).toBe('[Image] Meeting screenshot')
    })

    it('should search image entries by category', () => {
      const imageMetadata = {
        imagePath: 'images/photo.jpg',
        imageFormat: 'jpeg',
        imageSize: 2048,
      }

      journal.addEntry('[Image] Vacation photo', 'プライベート', 'image' as any, imageMetadata)
      journal.addEntry('Work document', '仕事')

      const privateEntries = journal.getEntriesByCategory('プライベート')
      expect(privateEntries).toHaveLength(1)
      expect(privateEntries[0].type).toBe('image')
      expect(privateEntries[0].content).toBe('[Image] Vacation photo')
    })

    it('should update image entry metadata', () => {
      const initialMetadata = {
        imagePath: 'images/temp.png',
        imageFormat: 'png',
        imageSize: 1024,
      }

      const entry = journal.addEntry('[Image] Temp', '仕事', 'image' as any, initialMetadata)

      const updatedMetadata = {
        ...initialMetadata,
        imagePath: 'images/final.png',
        description: 'Final version',
      }

      const success = journal.updateEntry(entry.id, {
        content: '[Image] Final version',
        metadata: updatedMetadata,
      })

      expect(success).toBe(true)

      const entries = journal.getEntries()
      const updatedEntry = entries.find(e => e.id === entry.id)
      expect(updatedEntry?.content).toBe('[Image] Final version')
      expect(updatedEntry?.metadata?.imagePath).toBe('images/final.png')
      expect(updatedEntry?.metadata?.description).toBe('Final version')
    })
  })

  describe('image entry validation', () => {
    it('should handle image entries with missing metadata gracefully', () => {
      const entry = journal.addEntry('[Image] No metadata', '仕事', 'image' as any)

      expect(entry.type).toBe('image')
      expect(entry.metadata).toBeUndefined()
    })

    it('should preserve image metadata structure', () => {
      const complexMetadata = {
        imagePath: 'images/complex.png',
        imageFormat: 'png',
        imageSize: 1024,
        originalFileName: 'my-screenshot.png',
        dimensions: {
          width: 800,
          height: 600,
        },
        uploadTime: new Date().toISOString(),
      }

      const entry = journal.addEntry('[Image] Complex', '仕事', 'image' as any, complexMetadata)

      expect(entry.metadata).toEqual(complexMetadata)
      expect(entry.metadata?.dimensions).toEqual({ width: 800, height: 600 })
    })
  })
})
