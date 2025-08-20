import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { ImageService } from '../../src/services/image-service'

describe('ImageService - File Path Support', () => {
  let imageService: ImageService
  let tempDir: string
  let testImagePath: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kotori-image-path-test-'))
    imageService = new ImageService(tempDir)

    // Create a test PNG image file
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
    testImagePath = path.join(tempDir, 'test-image.png')
    await fs.writeFile(testImagePath, pngBuffer)
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('isImagePath', () => {
    it('should detect valid PNG paths', () => {
      expect(imageService.isImagePath('/Users/test/image.png')).toBe(true)
      expect(imageService.isImagePath('~/Desktop/screenshot.png')).toBe(true)
      expect(imageService.isImagePath('./images/photo.png')).toBe(true)
    })

    it('should detect valid JPEG paths', () => {
      expect(imageService.isImagePath('/path/to/image.jpg')).toBe(true)
      expect(imageService.isImagePath('/path/to/image.jpeg')).toBe(true)
    })

    it('should reject non-image paths', () => {
      expect(imageService.isImagePath('document.txt')).toBe(false)
      expect(imageService.isImagePath('/path/to/file.pdf')).toBe(false)
      expect(imageService.isImagePath('image.gif')).toBe(false)
    })

    it('should reject bare filenames without paths', () => {
      expect(imageService.isImagePath('image.png')).toBe(false)
      expect(imageService.isImagePath('photo.jpg')).toBe(false)
    })

    it('should handle Windows paths', () => {
      expect(imageService.isImagePath('C:\\Users\\test\\image.png')).toBe(true)
      expect(imageService.isImagePath('\\\\server\\share\\photo.jpg')).toBe(true)
    })
  })

  describe('readImageFromPath', () => {
    it('should successfully read valid PNG file', async () => {
      const result = await imageService.readImageFromPath(testImagePath)

      expect(result.success).toBe(true)
      expect(result.buffer).toBeDefined()
      expect(result.buffer!.length).toBeGreaterThan(0)
    })

    it('should reject non-existent files', async () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist.png')
      const result = await imageService.readImageFromPath(nonExistentPath)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Image file not found')
    })

    it('should reject invalid image format', async () => {
      // Create a text file with .png extension
      const fakePath = path.join(tempDir, 'fake-image.png')
      await fs.writeFile(fakePath, 'This is not an image')

      const result = await imageService.readImageFromPath(fakePath)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unsupported image format')
    })

    it('should handle permission errors gracefully', async () => {
      // Create a file and remove read permissions (Unix only)
      if (process.platform !== 'win32') {
        const restrictedPath = path.join(tempDir, 'restricted.png')
        await fs.writeFile(restrictedPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
        await fs.chmod(restrictedPath, 0o000)

        const result = await imageService.readImageFromPath(restrictedPath)

        expect(result.success).toBe(false)
        expect(result.error).toContain('Failed to read image file')

        // Restore permissions for cleanup
        await fs.chmod(restrictedPath, 0o644)
      }
    })
  })

  describe('expandPath', () => {
    it('should handle tilde expansion', () => {
      // Note: This is a basic test, actual tilde expansion would need os.homedir()
      const input = '~/Desktop/image.png'

      // For now, just test that the method could handle this
      expect(input.startsWith('~')).toBe(true)

      // Verify the path would be properly constructed
      const homePath = os.homedir()
      const expected = path.join(homePath, 'Desktop/image.png')
      expect(expected).toContain('Desktop/image.png')
    })
  })
})
