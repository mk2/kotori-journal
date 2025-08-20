import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { ensureDirectoryExists } from '../utils/directory.js'

export interface ImageValidationResult {
  isValid: boolean
  format?: 'png' | 'jpeg'
  error?: string
}

export interface ImageSaveResult {
  success: boolean
  filePath?: string
  fileName?: string
  error?: string
}

export interface ImageMetadata {
  format: 'png' | 'jpeg'
  size: number
  timestamp: Date
}

export class ImageService {
  private readonly imagesDir: string

  constructor(private dataPath: string) {
    this.imagesDir = path.join(dataPath, 'images')
  }

  validateImageFormat(buffer: Buffer): ImageValidationResult {
    if (!buffer || buffer.length < 4) {
      return {
        isValid: false,
        error: 'Invalid image data.',
      }
    }

    // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return {
        isValid: true,
        format: 'png',
      }
    }

    // Check JPEG signature: FF D8 FF
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return {
        isValid: true,
        format: 'jpeg',
      }
    }

    return {
      isValid: false,
      error: 'Unsupported image format. Only PNG and JPEG are supported.',
    }
  }

  async saveImage(buffer: Buffer): Promise<ImageSaveResult> {
    const validation = this.validateImageFormat(buffer)

    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      }
    }

    try {
      // Ensure images directory exists
      await ensureDirectoryExists(this.imagesDir)

      // Generate unique filename
      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const extension = validation.format === 'png' ? 'png' : 'jpg'
      const fileName = `${timestamp}-${randomSuffix}.${extension}`
      const filePath = path.join(this.imagesDir, fileName)

      // Save the image
      await fs.writeFile(filePath, buffer)

      return {
        success: true,
        filePath,
        fileName,
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  getImageMetadata(buffer: Buffer): ImageMetadata {
    const validation = this.validateImageFormat(buffer)

    return {
      format: validation.format!,
      size: buffer.length,
      timestamp: new Date(),
    }
  }

  generatePreview(buffer: Buffer): string {
    const validation = this.validateImageFormat(buffer)

    if (!validation.isValid) {
      return '[Invalid Image]'
    }

    const formatName = validation.format!.toUpperCase()
    const sizeKB = Math.round(buffer.length / 1024)

    const preview = `
┌─────────────────────────────────┐
│  [${formatName} Image]                 │
│  Size: ${sizeKB} KB                    │
│  📷 Image pasted successfully    │
└─────────────────────────────────┘`

    return preview.trim()
  }

  async deleteImage(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(filePath)
      return true
    } catch {
      return false
    }
  }

  async imageExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  getRelativeImagePath(filePath: string): string {
    return path.relative(this.dataPath, filePath)
  }

  async readImageFromPath(
    imagePath: string
  ): Promise<{ success: boolean; buffer?: Buffer; error?: string }> {
    try {
      // Expand path (handle ~ for home directory)
      const expandedPath = this.expandPath(imagePath)

      // Check if file exists
      await fs.access(expandedPath)

      // Read the file
      const buffer = await fs.readFile(expandedPath)

      // Validate it's a supported image format
      const validation = this.validateImageFormat(buffer)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        }
      }

      return {
        success: true,
        buffer,
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          success: false,
          error: `Image file not found: ${imagePath}`,
        }
      }
      return {
        success: false,
        error: `Failed to read image file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  isImagePath(inputText: string): boolean {
    // Check if the input looks like a file path to an image
    const imageExtensions = ['.png', '.jpg', '.jpeg']
    const trimmedInput = inputText.trim()
    const lowerInput = trimmedInput.toLowerCase()

    // Reject empty input
    if (!trimmedInput) {
      return false
    }

    // Reject inputs that look like references or placeholders
    if (this.looksLikeReference(trimmedInput)) {
      return false
    }

    // Must end with image extension
    if (!imageExtensions.some(ext => lowerInput.endsWith(ext))) {
      return false
    }

    // Must look like a path (contain / or \)
    if (!lowerInput.includes('/') && !lowerInput.includes('\\')) {
      return false
    }

    // Additional validation: must have reasonable path structure
    if (!this.hasValidPathStructure(trimmedInput)) {
      return false
    }

    return true
  }

  validateImagePathWithReason(inputText: string): { isValid: boolean; reason?: string } {
    const trimmedInput = inputText.trim()
    const lowerInput = trimmedInput.toLowerCase()
    const imageExtensions = ['.png', '.jpg', '.jpeg']

    if (!trimmedInput) {
      return { isValid: false, reason: 'Input is empty' }
    }

    if (this.looksLikeReference(trimmedInput)) {
      return {
        isValid: false,
        reason: 'Input looks like a reference or placeholder (e.g., [Image #3]), not a file path',
      }
    }

    if (!imageExtensions.some(ext => lowerInput.endsWith(ext))) {
      return {
        isValid: false,
        reason: `File must end with one of: ${imageExtensions.join(', ')}`,
      }
    }

    if (!lowerInput.includes('/') && !lowerInput.includes('\\')) {
      return {
        isValid: false,
        reason: 'Input must contain a path separator (/ or \\) to be recognized as a file path',
      }
    }

    if (!this.hasValidPathStructure(trimmedInput)) {
      return {
        isValid: false,
        reason: 'Input does not have a valid file path structure',
      }
    }

    return { isValid: true }
  }

  private looksLikeReference(input: string): boolean {
    // Check for patterns that look like references rather than file paths
    const referencePatterns = [
      /^\[.*\]$/, // [Image #3], [Photo 1], etc.
      /^#\d+$/, // #3, #123, etc.
      /^Image\s*#\d+$/i, // Image #3, IMAGE #1, etc.
      /^Photo\s*#\d+$/i, // Photo #3, PHOTO #1, etc.
      /^\d+\.\d+\.\d+\.(png|jpg|jpeg)$/i, // Time-like patterns: 7.42.30.png, 12.45.59.jpg
    ]

    return referencePatterns.some(pattern => pattern.test(input))
  }

  private hasValidPathStructure(input: string): boolean {
    // Basic path structure validation
    const path = input.toLowerCase()

    // Should not start with just a number and dot (like time format)
    if (/^\d+\./.test(path)) {
      return false
    }

    // Should have a reasonable path structure
    const pathParts = path.split(/[/\\]/)

    // At least 2 parts (directory + filename)
    if (pathParts.length < 2) {
      return false
    }

    // Filename should not be empty and should be reasonable length
    const filename = pathParts[pathParts.length - 1]
    if (!filename || filename.length < 5) {
      // at least "a.png"
      return false
    }

    // Extract the base filename without extension
    const baseName = filename.replace(/\.[^/.]+$/, '')
    if (baseName.length < 2) {
      // Reject single-character base names
      return false
    }

    // Directory part should also be reasonable (not just single character paths like "/a.png")
    const dirParts = pathParts.slice(0, -1)
    const meaningfulDirParts = dirParts.filter(part => part.length > 0)
    if (meaningfulDirParts.length === 0) {
      return false // No directory part
    }

    // Check for overly short directory names (like single letter directories)
    // Allow common short names like ~, ., .., but reject single letters in root
    if (
      meaningfulDirParts.length === 1 &&
      meaningfulDirParts[0].length === 1 &&
      !['~', '.', '..'].includes(meaningfulDirParts[0]) &&
      !meaningfulDirParts[0].match(/^[a-zA-Z]:$/)
    ) {
      // Allow Windows drive letters
      return false
    }

    return true
  }

  private expandPath(inputPath: string): string {
    // Handle tilde expansion for home directory
    if (inputPath.startsWith('~/')) {
      return path.join(os.homedir(), inputPath.slice(2))
    }

    // Handle bare tilde
    if (inputPath === '~') {
      return os.homedir()
    }

    // Return path as-is for absolute and relative paths
    return inputPath
  }
}
