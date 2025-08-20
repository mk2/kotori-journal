import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { ImageService } from '../../src/services/image-service'

describe('ImageService - Enhanced Validation', () => {
  let imageService: ImageService
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kotori-validation-test-'))
    imageService = new ImageService(tempDir)
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('reference pattern detection', () => {
    it('should reject [Image #3] style references', () => {
      const testCases = [
        '[Image #1]',
        '[Image #3]',
        '[Image #10]',
        '[Photo #1]',
        '[Diagram #5]',
        '[Screenshot #2]',
        '[anything]',
      ]

      testCases.forEach(testCase => {
        expect(imageService.isImagePath(testCase)).toBe(false)

        const validation = imageService.validateImagePathWithReason(testCase)
        expect(validation.isValid).toBe(false)
        expect(validation.reason).toContain('reference or placeholder')
      })
    })

    it('should reject numbered patterns', () => {
      const testCases = ['#3', '#123', 'Image #3', 'IMAGE #1', 'Photo #5', 'PHOTO #10']

      testCases.forEach(testCase => {
        expect(imageService.isImagePath(testCase)).toBe(false)

        const validation = imageService.validateImagePathWithReason(testCase)
        expect(validation.isValid).toBe(false)
        expect(validation.reason).toContain('reference or placeholder')
      })
    })

    it('should reject time-like patterns', () => {
      const testCases = ['7.42.30.png', '12.45.59.jpg', '1.23.45.jpeg', '23.59.59.png']

      testCases.forEach(testCase => {
        expect(imageService.isImagePath(testCase)).toBe(false)

        const validation = imageService.validateImagePathWithReason(testCase)
        expect(validation.isValid).toBe(false)
        expect(validation.reason).toContain('reference or placeholder')
      })
    })
  })

  describe('valid path acceptance', () => {
    it('should accept valid image paths', () => {
      const validPaths = [
        '/Users/test/image.png',
        '~/Desktop/screenshot.jpg',
        './images/photo.jpeg',
        '../assets/icon.png',
        'C:\\Users\\test\\image.png',
        '/home/user/pictures/vacation.jpg',
      ]

      validPaths.forEach(testPath => {
        expect(imageService.isImagePath(testPath)).toBe(true)

        const validation = imageService.validateImagePathWithReason(testPath)
        expect(validation.isValid).toBe(true)
        expect(validation.reason).toBeUndefined()
      })
    })
  })

  describe('edge case handling', () => {
    it('should reject empty or whitespace-only input', () => {
      const emptyCases = ['', '   ', '\t', '\n']

      emptyCases.forEach(testCase => {
        expect(imageService.isImagePath(testCase)).toBe(false)

        const validation = imageService.validateImagePathWithReason(testCase)
        expect(validation.isValid).toBe(false)
        expect(validation.reason).toBe('Input is empty')
      })
    })

    it('should reject files without extensions', () => {
      const noExtensionCases = ['/path/to/image', '~/Desktop/screenshot', './images/photo']

      noExtensionCases.forEach(testCase => {
        expect(imageService.isImagePath(testCase)).toBe(false)

        const validation = imageService.validateImagePathWithReason(testCase)
        expect(validation.isValid).toBe(false)
        expect(validation.reason).toContain('must end with one of')
      })
    })

    it('should reject unsupported extensions', () => {
      const unsupportedCases = [
        '/path/to/image.gif',
        '~/Desktop/image.bmp',
        './images/photo.webp',
        '/path/file.txt',
      ]

      unsupportedCases.forEach(testCase => {
        expect(imageService.isImagePath(testCase)).toBe(false)

        const validation = imageService.validateImagePathWithReason(testCase)
        expect(validation.isValid).toBe(false)
        expect(validation.reason).toContain('must end with one of')
      })
    })

    it('should reject bare filenames without paths', () => {
      const bareFilenames = ['image.png', 'photo.jpg', 'screenshot.jpeg']

      bareFilenames.forEach(testCase => {
        expect(imageService.isImagePath(testCase)).toBe(false)

        const validation = imageService.validateImagePathWithReason(testCase)
        expect(validation.isValid).toBe(false)
        expect(validation.reason).toContain('path separator')
      })
    })

    it('should reject paths that are too short', () => {
      const shortPaths = ['/a.png', '~/b.jpg', './c.jpeg']

      shortPaths.forEach(testCase => {
        expect(imageService.isImagePath(testCase)).toBe(false)

        const validation = imageService.validateImagePathWithReason(testCase)
        expect(validation.isValid).toBe(false)
        expect(validation.reason).toContain('valid file path structure')
      })
    })
  })

  describe('user-reported bug specific tests', () => {
    it('should specifically handle the [Image #3] case', () => {
      const problematicInput = '[Image #3]'

      expect(imageService.isImagePath(problematicInput)).toBe(false)

      const validation = imageService.validateImagePathWithReason(problematicInput)
      expect(validation.isValid).toBe(false)
      expect(validation.reason).toContain('reference or placeholder')
      expect(validation.reason).toContain('[Image #3]')
    })

    it('should specifically handle time-like filename patterns', () => {
      const timePattern = '7.42.30.png'

      expect(imageService.isImagePath(timePattern)).toBe(false)

      const validation = imageService.validateImagePathWithReason(timePattern)
      expect(validation.isValid).toBe(false)
      expect(validation.reason).toContain('reference or placeholder')
    })

    it('should provide clear error messages for common mistakes', () => {
      const commonMistakes = [
        { input: '[Image #3]', expectedReason: 'reference or placeholder' },
        { input: 'screenshot.png', expectedReason: 'path separator' },
        { input: 'image.gif', expectedReason: 'must end with one of' },
        { input: '/a.png', expectedReason: 'valid file path structure' },
        { input: '', expectedReason: 'Input is empty' },
      ]

      commonMistakes.forEach(({ input, expectedReason }) => {
        const validation = imageService.validateImagePathWithReason(input)
        expect(validation.isValid).toBe(false)
        expect(validation.reason).toContain(expectedReason)
      })
    })
  })
})
