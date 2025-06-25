import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OGPExtractor } from '../src/services/ogp-extractor'

// Mock DOM and Chrome APIs
global.document = {
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(),
} as any

global.chrome = {
  runtime: {
    sendMessage: vi.fn(),
  },
} as any

describe('OGPExtractor', () => {
  let ogpExtractor: OGPExtractor

  beforeEach(() => {
    vi.clearAllMocks()
    ogpExtractor = new OGPExtractor()
  })

  describe('OGP extraction', () => {
    it('should extract og:title', () => {
      const mockElement = {
        getAttribute: vi.fn().mockReturnValue('Test OGP Title'),
      }
      vi.mocked(document.querySelector).mockReturnValue(mockElement as any)

      const ogpData = ogpExtractor.extract()

      expect(document.querySelector).toHaveBeenCalledWith('meta[property="og:title"]')
      expect(ogpData.title).toBe('Test OGP Title')
    })

    it('should extract og:description', () => {
      const mockTitleElement = {
        getAttribute: vi.fn().mockReturnValue(null),
      }
      const mockDescElement = {
        getAttribute: vi.fn().mockReturnValue('Test description'),
      }

      vi.mocked(document.querySelector)
        .mockReturnValueOnce(mockTitleElement as any) // og:title
        .mockReturnValueOnce(mockDescElement as any) // og:description

      const ogpData = ogpExtractor.extract()

      expect(document.querySelector).toHaveBeenCalledWith('meta[property="og:description"]')
      expect(ogpData.description).toBe('Test description')
    })

    it('should extract og:image', () => {
      const mockElements = [
        { getAttribute: vi.fn().mockReturnValue(null) }, // og:title
        { getAttribute: vi.fn().mockReturnValue(null) }, // og:description
        { getAttribute: vi.fn().mockReturnValue('https://example.com/image.jpg') }, // og:image
      ]

      vi.mocked(document.querySelector)
        .mockReturnValueOnce(mockElements[0] as any)
        .mockReturnValueOnce(mockElements[1] as any)
        .mockReturnValueOnce(mockElements[2] as any)

      const ogpData = ogpExtractor.extract()

      expect(document.querySelector).toHaveBeenCalledWith('meta[property="og:image"]')
      expect(ogpData.image).toBe('https://example.com/image.jpg')
    })

    it('should return empty object when no OGP tags found', () => {
      vi.mocked(document.querySelector).mockReturnValue(null)

      const ogpData = ogpExtractor.extract()

      expect(ogpData).toEqual({})
    })

    it('should handle malformed meta tags gracefully', () => {
      const mockElement = {
        getAttribute: vi.fn().mockReturnValue(''),
      }
      vi.mocked(document.querySelector).mockReturnValue(mockElement as any)

      const ogpData = ogpExtractor.extract()

      expect(ogpData).toEqual({})
    })
  })

  describe('Fallback extraction', () => {
    it('should use page title as fallback when og:title is missing', () => {
      // Mock missing OGP title
      vi.mocked(document.querySelector)
        .mockReturnValueOnce(null) // og:title
        .mockReturnValueOnce(null) // og:description
        .mockReturnValueOnce(null) // og:image

      // Mock page title
      Object.defineProperty(document, 'title', {
        value: 'Page Title',
        configurable: true,
      })

      const ogpData = ogpExtractor.extractWithFallback()

      expect(ogpData.title).toBe('Page Title')
    })

    it('should use meta description as fallback', () => {
      const mockDescElement = {
        getAttribute: vi.fn().mockReturnValue('Meta description'),
      }

      vi.mocked(document.querySelector)
        .mockReturnValueOnce(null) // og:title
        .mockReturnValueOnce(null) // og:description
        .mockReturnValueOnce(null) // og:image
        .mockReturnValueOnce(mockDescElement as any) // meta[name="description"]

      const ogpData = ogpExtractor.extractWithFallback()

      expect(ogpData.description).toBe('Meta description')
    })
  })

  describe('Auto-send functionality', () => {
    it('should send OGP data to background script when found', () => {
      const mockTitleElement = {
        getAttribute: vi.fn().mockReturnValue('Test Title'),
      }

      vi.mocked(document.querySelector)
        .mockReturnValueOnce(mockTitleElement as any) // og:title
        .mockReturnValueOnce(null) // og:description
        .mockReturnValueOnce(null) // og:image

      ogpExtractor.extractAndSend()

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'ogp-data',
        data: { title: 'Test Title' },
      })
    })

    it('should not send empty OGP data', () => {
      vi.mocked(document.querySelector).mockReturnValue(null)

      // Mock document.title to be empty too
      Object.defineProperty(document, 'title', {
        value: '',
        configurable: true,
      })

      ogpExtractor.extractAndSend()

      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
    })
  })
})
