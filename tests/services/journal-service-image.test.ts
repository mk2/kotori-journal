import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { JournalService } from '../../src/services/journal-service'

describe('JournalService - Image Integration', () => {
  let journalService: JournalService
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kotori-journal-test-'))
    journalService = new JournalService(tempDir)
    await journalService.initialize()
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('addImageEntry', () => {
    it('should add image entry with metadata', async () => {
      const imageBuffer = Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
        ...Array(100).fill(0),
      ])

      const entry = await journalService.addImageEntry(
        imageBuffer,
        '仕事',
        'Screenshot from meeting'
      )

      expect(entry.type).toBe('image')
      expect(entry.category).toBe('仕事')
      expect(entry.content).toContain('Screenshot from meeting')
      expect(entry.metadata).toBeDefined()
      expect(entry.metadata?.imagePath).toBeDefined()
      expect(entry.metadata?.imageFormat).toBe('png')
      expect(entry.metadata?.imageSize).toBe(imageBuffer.length)
    })

    it('should add image entry with default description', async () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(100).fill(0)])

      const entry = await journalService.addImageEntry(jpegBuffer, '未分類')

      expect(entry.type).toBe('image')
      expect(entry.category).toBe('未分類')
      expect(entry.content).toBe('[Image]')
      expect(entry.metadata?.imageFormat).toBe('jpeg')
    })

    it('should reject invalid image format', async () => {
      const invalidBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38]) // GIF signature

      await expect(journalService.addImageEntry(invalidBuffer, '仕事')).rejects.toThrow(
        'Unsupported image format. Only PNG and JPEG are supported.'
      )
    })

    it('should save image file to disk', async () => {
      const pngBuffer = Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
        ...Array(100).fill(0),
      ])

      const entry = await journalService.addImageEntry(pngBuffer, '仕事', 'Test image')

      // Verify image file exists
      const imagePath = path.join(tempDir, entry.metadata?.imagePath as string)
      const imageExists = await fs
        .access(imagePath)
        .then(() => true)
        .catch(() => false)
      expect(imageExists).toBe(true)

      // Verify file content
      const savedBuffer = await fs.readFile(imagePath)
      expect(savedBuffer.equals(pngBuffer)).toBe(true)
    })
  })

  describe('getImageEntries', () => {
    it('should retrieve all image entries', async () => {
      const pngBuffer = Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
        ...Array(100).fill(0),
      ])
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(100).fill(0)])

      await journalService.addImageEntry(pngBuffer, '仕事', 'First image')
      await journalService.addEntry('Regular text entry', '仕事')
      await journalService.addImageEntry(jpegBuffer, 'プライベート', 'Second image')

      const imageEntries = journalService.getImageEntries()
      expect(imageEntries).toHaveLength(2)
      expect(imageEntries[0].content).toContain('First image')
      expect(imageEntries[1].content).toContain('Second image')
      expect(imageEntries.every(e => e.type === 'image')).toBe(true)
    })

    it('should retrieve image entries by date', async () => {
      const today = new Date()
      const pngBuffer = Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
        ...Array(100).fill(0),
      ])

      await journalService.addImageEntry(pngBuffer, '仕事', 'Today image')
      await journalService.addEntry('Text entry', '仕事')

      const imageEntries = journalService.getImageEntriesByDate(today)
      expect(imageEntries).toHaveLength(1)
      expect(imageEntries[0].content).toContain('Today image')
      expect(imageEntries[0].type).toBe('image')
    })
  })

  describe('searchImageEntries', () => {
    it('should search image entries by content', async () => {
      const pngBuffer = Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
        ...Array(100).fill(0),
      ])

      await journalService.addImageEntry(pngBuffer, '仕事', 'Meeting screenshot')
      await journalService.addImageEntry(pngBuffer, '仕事', 'Diagram photo')
      await journalService.addEntry('Meeting notes', '仕事')

      const searchResults = journalService.searchEntries('screenshot')
      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].type).toBe('image')
      expect(searchResults[0].content).toContain('Meeting screenshot')
    })
  })

  describe('integration with daily reports', () => {
    it('should include image entries in daily report generation', async () => {
      const pngBuffer = Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
        ...Array(100).fill(0),
      ])
      const today = new Date()

      await journalService.addEntry('Text entry for today', '仕事')
      await journalService.addImageEntry(pngBuffer, '仕事', 'Screenshot from meeting')

      await journalService.generateDailyReport(today)

      // Check if report file was created
      const year = today.getFullYear().toString()
      const month = (today.getMonth() + 1).toString().padStart(2, '0')
      const day = today.getDate().toString().padStart(2, '0')
      const reportPath = path.join(tempDir, year, month, `${day}.md`)

      const reportExists = await fs
        .access(reportPath)
        .then(() => true)
        .catch(() => false)
      expect(reportExists).toBe(true)

      // Check report content includes both text and image entries
      const reportContent = await fs.readFile(reportPath, 'utf-8')
      expect(reportContent).toContain('Text entry for today')
      expect(reportContent).toContain('Screenshot from meeting')
      expect(reportContent).toContain('![Screenshot from meeting]')
    })
  })
})
