import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { JournalService } from '../../src/services/journal-service'

describe('Image Workflow Integration - Real File Test', () => {
  let journalService: JournalService
  let tempDir: string
  let testImagePath: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kotori-workflow-test-'))
    journalService = new JournalService(tempDir)
    await journalService.initialize()

    // Create a realistic test PNG image file
    const pngBuffer = Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a, // PNG signature
      0x00,
      0x00,
      0x00,
      0x0d, // IHDR chunk length
      0x49,
      0x48,
      0x44,
      0x52, // IHDR
      0x00,
      0x00,
      0x00,
      0x01, // width: 1
      0x00,
      0x00,
      0x00,
      0x01, // height: 1
      0x08,
      0x02,
      0x00,
      0x00,
      0x00, // bit depth, color type, compression, filter, interlace
      0x90,
      0x77,
      0x53,
      0xde, // CRC
      0x00,
      0x00,
      0x00,
      0x0c, // IDAT chunk length
      0x49,
      0x44,
      0x41,
      0x54, // IDAT
      0x08,
      0xd7,
      0x63,
      0xf8,
      0x0f,
      0x00,
      0x00,
      0x01,
      0x00,
      0x01, // image data
      0x5c,
      0x6a,
      0x42,
      0x2e, // CRC
      0x00,
      0x00,
      0x00,
      0x00, // IEND chunk length
      0x49,
      0x45,
      0x4e,
      0x44, // IEND
      0xae,
      0x42,
      0x60,
      0x82, // CRC
    ])

    testImagePath = path.join(tempDir, 'test-screenshot.png')
    await fs.writeFile(testImagePath, pngBuffer)
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('complete image workflow', () => {
    it('should handle full workflow: detect path -> read file -> save -> generate report', async () => {
      // 1. Test path detection
      expect(journalService.isImagePath(testImagePath)).toBe(true)

      // 2. Add image from path
      const entry = await journalService.addImageFromPath(
        testImagePath,
        '仕事',
        'Test screenshot from workflow'
      )

      expect(entry.type).toBe('image')
      expect(entry.category).toBe('仕事')
      expect(entry.content).toBe('[Image] Test screenshot from workflow')
      expect(entry.metadata?.imageFormat).toBe('png')

      // 3. Verify image was saved to images directory
      const imagePath = path.join(tempDir, entry.metadata?.imagePath as string)
      const imageExists = await fs
        .access(imagePath)
        .then(() => true)
        .catch(() => false)
      expect(imageExists).toBe(true)

      // 4. Verify file content is correct
      const savedBuffer = await fs.readFile(imagePath)
      expect(savedBuffer.length).toBeGreaterThan(0)

      // 5. Generate daily report and verify image is included
      const today = new Date()
      await journalService.generateDailyReport(today)

      const year = today.getFullYear().toString()
      const month = (today.getMonth() + 1).toString().padStart(2, '0')
      const day = today.getDate().toString().padStart(2, '0')
      const reportPath = path.join(tempDir, year, month, `${day}.md`)

      const reportContent = await fs.readFile(reportPath, 'utf-8')
      expect(reportContent).toContain('Test screenshot from workflow')
      expect(reportContent).toContain('![Test screenshot from workflow]')
      expect(reportContent).toContain('Size:')
      expect(reportContent).toContain('Format: PNG')
    })

    it('should handle tilde path expansion', async () => {
      // Move test image to a temp location that looks like a home directory path
      const homeTestDir = path.join(os.homedir(), '.kotori-test-temp')
      await fs.mkdir(homeTestDir, { recursive: true })

      const homeImagePath = path.join(homeTestDir, 'home-test.png')
      const pngBuffer = await fs.readFile(testImagePath)
      await fs.writeFile(homeImagePath, pngBuffer)

      try {
        // Test with tilde path
        const tildeImagePath = homeImagePath.replace(os.homedir(), '~')
        expect(journalService.isImagePath(tildeImagePath)).toBe(true)

        const entry = await journalService.addImageFromPath(
          tildeImagePath,
          'テスト',
          'Home directory image'
        )

        expect(entry.type).toBe('image')
        expect(entry.content).toBe('[Image] Home directory image')
      } finally {
        // Cleanup
        await fs.rm(homeTestDir, { recursive: true, force: true })
      }
    })

    it('should auto-generate description from filename when not provided', async () => {
      const entry = await journalService.addImageFromPath(testImagePath, '仕事')

      expect(entry.content).toBe('[Image] test-screenshot')
      expect(entry.metadata?.originalFileName).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should handle non-existent image files', async () => {
      const nonExistentPath = '/path/that/does/not/exist.png'

      await expect(journalService.addImageFromPath(nonExistentPath, '仕事')).rejects.toThrow(
        'Image file not found'
      )
    })

    it('should handle invalid image files', async () => {
      const textFilePath = path.join(tempDir, 'not-an-image.png')
      await fs.writeFile(textFilePath, 'This is just text')

      await expect(journalService.addImageFromPath(textFilePath, '仕事')).rejects.toThrow(
        'Unsupported image format'
      )
    })
  })
})
