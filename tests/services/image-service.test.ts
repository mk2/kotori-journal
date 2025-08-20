import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { ImageService } from '../../src/services/image-service'

describe('ImageService', () => {
  let imageService: ImageService
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kotori-image-test-'))
    imageService = new ImageService(tempDir)
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('validateImageFormat', () => {
    it('should validate PNG format', () => {
      // PNG file signature: 89 50 4E 47 0D 0A 1A 0A
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

      const result = imageService.validateImageFormat(pngBuffer)

      expect(result.isValid).toBe(true)
      expect(result.format).toBe('png')
    })

    it('should validate JPEG format', () => {
      // JPEG file signature: FF D8 FF
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0])

      const result = imageService.validateImageFormat(jpegBuffer)

      expect(result.isValid).toBe(true)
      expect(result.format).toBe('jpeg')
    })

    it('should reject unsupported formats', () => {
      // GIF file signature: 47 49 46 38
      const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38])

      const result = imageService.validateImageFormat(gifBuffer)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Unsupported image format. Only PNG and JPEG are supported.')
    })

    it('should reject empty buffer', () => {
      const emptyBuffer = Buffer.alloc(0)

      const result = imageService.validateImageFormat(emptyBuffer)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid image data.')
    })

    it('should reject too small buffer', () => {
      const smallBuffer = Buffer.from([0x89])

      const result = imageService.validateImageFormat(smallBuffer)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid image data.')
    })
  })

  describe('saveImage', () => {
    it('should save PNG image with unique filename', async () => {
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

      const result = await imageService.saveImage(pngBuffer)

      expect(result.success).toBe(true)
      expect(result.filePath).toBeDefined()
      expect(result.fileName).toBeDefined()
      expect(result.fileName?.endsWith('.png')).toBe(true)

      // Verify file was actually saved
      const savedExists = await fs
        .access(result.filePath!)
        .then(() => true)
        .catch(() => false)
      expect(savedExists).toBe(true)
    })

    it('should save JPEG image with unique filename', async () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(100).fill(0)])

      const result = await imageService.saveImage(jpegBuffer)

      expect(result.success).toBe(true)
      expect(result.filePath).toBeDefined()
      expect(result.fileName).toBeDefined()
      expect(result.fileName?.endsWith('.jpg')).toBe(true)
    })

    it('should reject invalid image format', async () => {
      const invalidBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38])

      const result = await imageService.saveImage(invalidBuffer)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unsupported image format. Only PNG and JPEG are supported.')
    })

    it('should create images directory if it does not exist', async () => {
      const newTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kotori-new-test-'))
      const newImageService = new ImageService(newTempDir)
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

      const result = await newImageService.saveImage(pngBuffer)

      expect(result.success).toBe(true)

      // Verify images directory was created
      const imagesDir = path.join(newTempDir, 'images')
      const dirExists = await fs
        .access(imagesDir)
        .then(() => true)
        .catch(() => false)
      expect(dirExists).toBe(true)

      // Cleanup
      await fs.rm(newTempDir, { recursive: true, force: true })
    })
  })

  describe('getImageMetadata', () => {
    it('should extract basic metadata from PNG', () => {
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

      const metadata = imageService.getImageMetadata(pngBuffer)

      expect(metadata.format).toBe('png')
      expect(metadata.size).toBe(pngBuffer.length)
      expect(metadata.timestamp).toBeInstanceOf(Date)
    })

    it('should extract basic metadata from JPEG', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(100).fill(0)])

      const metadata = imageService.getImageMetadata(jpegBuffer)

      expect(metadata.format).toBe('jpeg')
      expect(metadata.size).toBe(jpegBuffer.length)
      expect(metadata.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('generatePreview', () => {
    it('should generate ASCII preview for PNG', () => {
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

      const preview = imageService.generatePreview(pngBuffer)

      expect(preview).toContain('[PNG Image]')
      expect(preview).toContain('Size:')
    })

    it('should generate ASCII preview for JPEG', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(100).fill(0)])

      const preview = imageService.generatePreview(jpegBuffer)

      expect(preview).toContain('[JPEG Image]')
      expect(preview).toContain('Size:')
    })
  })
})
