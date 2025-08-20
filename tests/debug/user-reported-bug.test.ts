import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { JournalService } from '../../src/services/journal-service'

describe('User Reported Bug: [Image #3] -> 7.42.30.png', () => {
  let journalService: JournalService
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kotori-bug-test-'))
    journalService = new JournalService(tempDir)
    await journalService.initialize()
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('reproduce exact user scenario', () => {
    it('should handle "[Image #3]" as regular text entry, not as image', async () => {
      const userInput = '[Image #3]'

      // This should be treated as regular text, not an image
      expect(journalService.isImagePath(userInput)).toBe(false)

      // Add it as a regular entry
      const entry = await journalService.addEntry(userInput, '仕事')

      expect(entry.type).toBe('entry') // Not 'image'
      expect(entry.content).toBe('[Image #3]')
      expect(entry.metadata).toBeUndefined()

      console.log('Entry created:', {
        id: entry.id,
        content: entry.content,
        type: entry.type,
        metadata: entry.metadata,
      })
    })

    it('should test if input processing might modify the content somehow', async () => {
      const testInputs = [
        '[Image #1]',
        '[Image #2]',
        '[Image #3]',
        '[Image #10]',
        '[Photo #1]',
        'Image #3',
        '#3',
      ]

      for (const input of testInputs) {
        const entry = await journalService.addEntry(input, 'テスト')

        console.log(`Input: "${input}" -> Entry: "${entry.content}"`)
        expect(entry.content).toBe(input) // Content should not be modified
        expect(entry.type).toBe('entry')
      }
    })

    it('should test the journal submission hook path', async () => {
      const problematicInput = '[Image #3]'

      // Simulate the useJournalSubmit hook logic
      let resultEntry = null
      let errorMessage = null

      try {
        if (journalService.isImagePath(problematicInput)) {
          // This path should NOT be taken
          resultEntry = await journalService.addImageFromPath(problematicInput, '仕事')
          console.log('ERROR: Incorrectly processed as image path!')
        } else {
          // This path SHOULD be taken
          resultEntry = await journalService.addEntry(problematicInput, '仕事')
          console.log('Correctly processed as regular entry')
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error)
        console.log('Error occurred:', errorMessage)
      }

      expect(resultEntry).toBeDefined()
      expect(resultEntry?.content).toBe('[Image #3]')
      expect(resultEntry?.type).toBe('entry')
      expect(errorMessage).toBeNull()
    })

    it('should check if there are any time-based filename generations in the codebase', () => {
      // Check for any patterns that might generate '7.42.30.png'
      const now = new Date()
      const timeString = now.toTimeString().split(' ')[0] // HH:MM:SS
      const timeWithDots = timeString.replace(/:/g, '.')

      console.log('Current time with dots:', timeWithDots)
      console.log('Would become filename:', `${timeWithDots}.png`)

      // This could explain where '7.42.30.png' comes from - it looks like time formatting
      const pattern = /^\d{1,2}\.\d{2}\.\d{2}$/
      expect(pattern.test('7.42.30')).toBe(true)
    })
  })

  describe('investigate if filename appears anywhere in the system', () => {
    it('should check all journal entries and files created', async () => {
      const userInput = '[Image #3]'

      // Add the entry
      await journalService.addEntry(userInput, '仕事')

      // Check temp files
      const tempDir = path.join(journalService['storage']['dataPath'], '.temp')

      try {
        const tempFiles = await fs.readdir(tempDir)
        console.log('Temp files created:', tempFiles)

        // Check if any file contains the problematic pattern
        for (const file of tempFiles) {
          const filePath = path.join(tempDir, file)
          const content = await fs.readFile(filePath, 'utf-8')
          const data = JSON.parse(content)

          console.log('File content:', data)

          // Make sure no unexpected filenames are generated
          expect(data.content).toBe('[Image #3]')
          expect(data.type).toBe('entry')
        }
      } catch (error) {
        console.log('No temp files or error reading them:', error)
      }
    })
  })
})
