import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { ImageService } from '../../src/services/image-service'
import { JournalService } from '../../src/services/journal-service'

describe('Debug: Path Detection Issue', () => {
  let imageService: ImageService
  let journalService: JournalService
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kotori-debug-test-'))
    imageService = new ImageService(tempDir)
    journalService = new JournalService(tempDir)
    await journalService.initialize()
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('problematic input cases', () => {
    it('should NOT detect "[Image #3]" as an image path', () => {
      const problematicInput = '[Image #3]'

      console.log('Testing input:', problematicInput)
      const isDetected = imageService.isImagePath(problematicInput)
      console.log('Is detected as image path:', isDetected)

      expect(isDetected).toBe(false)
    })

    it('should NOT detect "[Image #3]" via JournalService', () => {
      const problematicInput = '[Image #3]'

      const isDetected = journalService.isImagePath(problematicInput)
      console.log('JournalService detects as image path:', isDetected)

      expect(isDetected).toBe(false)
    })

    it('should test various similar patterns', () => {
      const testCases = [
        '[Image #1]',
        '[Image #2]',
        '[Image #3]',
        '[Image]',
        '[Photo #1]',
        'Image #3',
        '#3',
        '7.42.30.png',
        '[7.42.30.png]',
      ]

      testCases.forEach(testCase => {
        const isDetected = imageService.isImagePath(testCase)
        console.log(`"${testCase}" -> detected: ${isDetected}`)

        // Only the last two should be detected as paths
        if (testCase === '7.42.30.png') {
          expect(isDetected).toBe(false) // No path separator
        } else if (testCase === '[7.42.30.png]') {
          expect(isDetected).toBe(false) // No path separator
        } else {
          expect(isDetected).toBe(false)
        }
      })
    })

    it('should test what happens when we try to process "[Image #3]"', async () => {
      const problematicInput = '[Image #3]'

      // This should fail gracefully
      try {
        await journalService.addImageFromPath(problematicInput, '仕事')
        // Should not reach here
        expect(true).toBe(false)
      } catch (error) {
        console.log('Expected error:', error instanceof Error ? error.message : error)
        expect(error instanceof Error).toBe(true)
      }
    })
  })

  describe('investigate where the filename comes from', () => {
    it('should check if there is any automatic filename generation', () => {
      // Check if there's any logic that generates filenames like '7.42.30.png'
      const mockTime = new Date()
      const timeString = mockTime.toTimeString().split(' ')[0] // Gets HH:MM:SS
      console.log('Current time string:', timeString)

      // Check if this matches the pattern
      const timePattern = /^\d{1,2}\.\d{2}\.\d{2}\.png$/
      const problematicFilename = '7.42.30.png'

      console.log('Does "7.42.30.png" match time pattern?', timePattern.test(problematicFilename))
    })
  })
})
