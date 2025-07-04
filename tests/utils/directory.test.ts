import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import { ensureDirectoryExists, isValidDirectory } from '../../src/utils/directory.js'

describe('directory utilities', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = join(tmpdir(), `directory-test-${Date.now()}`)
  })

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('ensureDirectoryExists', () => {
    it('should create directory if it does not exist', async () => {
      const testDir = join(tempDir, 'new-dir')

      await ensureDirectoryExists(testDir)

      const stats = await fs.stat(testDir)
      expect(stats.isDirectory()).toBe(true)
    })

    it('should not throw if directory already exists', async () => {
      const testDir = join(tempDir, 'existing-dir')
      await fs.mkdir(testDir, { recursive: true })

      await expect(ensureDirectoryExists(testDir)).resolves.not.toThrow()

      const stats = await fs.stat(testDir)
      expect(stats.isDirectory()).toBe(true)
    })

    it('should work with nested directories', async () => {
      const testDir = join(tempDir, 'nested', 'deep', 'directory')

      await ensureDirectoryExists(testDir)

      const stats = await fs.stat(testDir)
      expect(stats.isDirectory()).toBe(true)
    })

    it('should throw error if path exists as a file', async () => {
      const testFile = join(tempDir, 'test-file.txt')
      await fs.mkdir(tempDir, { recursive: true })
      await fs.writeFile(testFile, 'test content')

      await expect(ensureDirectoryExists(testFile)).rejects.toThrow(
        'exists as a file, not a directory'
      )
    })

    it('should work with symbolic link pointing to directory', async () => {
      const realDir = join(tempDir, 'real-dir')
      const symLink = join(tempDir, 'sym-link')

      await fs.mkdir(tempDir, { recursive: true })
      await fs.mkdir(realDir)
      await fs.symlink(realDir, symLink)

      await expect(ensureDirectoryExists(symLink)).resolves.not.toThrow()

      const stats = await fs.lstat(symLink)
      expect(stats.isSymbolicLink()).toBe(true)
    })

    it('should throw error if symbolic link points to file', async () => {
      const realFile = join(tempDir, 'real-file.txt')
      const symLink = join(tempDir, 'sym-link')

      await fs.mkdir(tempDir, { recursive: true })
      await fs.writeFile(realFile, 'test content')
      await fs.symlink(realFile, symLink)

      await expect(ensureDirectoryExists(symLink)).rejects.toThrow(
        'exists as a symbolic link to a file, not a directory'
      )
    })

    it('should throw error if symbolic link is broken', async () => {
      const symLink = join(tempDir, 'broken-link')

      await fs.mkdir(tempDir, { recursive: true })
      await fs.symlink('/non-existent-path', symLink)

      await expect(ensureDirectoryExists(symLink)).rejects.toThrow(
        'exists as a broken symbolic link'
      )
    })
  })

  describe('isValidDirectory', () => {
    it('should return true for existing directory', async () => {
      const testDir = join(tempDir, 'test-dir')
      await fs.mkdir(testDir, { recursive: true })

      const result = await isValidDirectory(testDir)
      expect(result).toBe(true)
    })

    it('should return false for non-existent path', async () => {
      const testDir = join(tempDir, 'non-existent')

      const result = await isValidDirectory(testDir)
      expect(result).toBe(false)
    })

    it('should return false for file', async () => {
      const testFile = join(tempDir, 'test-file.txt')
      await fs.mkdir(tempDir, { recursive: true })
      await fs.writeFile(testFile, 'test content')

      const result = await isValidDirectory(testFile)
      expect(result).toBe(false)
    })

    it('should return true for symbolic link pointing to directory', async () => {
      const realDir = join(tempDir, 'real-dir')
      const symLink = join(tempDir, 'sym-link')

      await fs.mkdir(tempDir, { recursive: true })
      await fs.mkdir(realDir)
      await fs.symlink(realDir, symLink)

      const result = await isValidDirectory(symLink)
      expect(result).toBe(true)
    })

    it('should return false for symbolic link pointing to file', async () => {
      const realFile = join(tempDir, 'real-file.txt')
      const symLink = join(tempDir, 'sym-link')

      await fs.mkdir(tempDir, { recursive: true })
      await fs.writeFile(realFile, 'test content')
      await fs.symlink(realFile, symLink)

      const result = await isValidDirectory(symLink)
      expect(result).toBe(false)
    })

    it('should return false for broken symbolic link', async () => {
      const symLink = join(tempDir, 'broken-link')

      await fs.mkdir(tempDir, { recursive: true })
      await fs.symlink('/non-existent-path', symLink)

      const result = await isValidDirectory(symLink)
      expect(result).toBe(false)
    })
  })
})
