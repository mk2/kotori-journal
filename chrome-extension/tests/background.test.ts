import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PageTracker } from '../src/services/page-tracker'
import { DataSender } from '../src/services/data-sender'
import type { BrowserHistoryEntry } from '../src/types'

describe('PageTracker', () => {
  let pageTracker: PageTracker
  let dataSender: DataSender

  beforeEach(() => {
    vi.clearAllMocks()
    dataSender = new DataSender()
    pageTracker = new PageTracker(dataSender)
  })

  describe('Tab tracking', () => {
    it('should start tracking when a tab is activated', async () => {
      const mockTab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example Page',
      }

      vi.mocked(chrome.tabs.get).mockResolvedValue(mockTab as any)

      const startTrackingSpy = vi.spyOn(pageTracker, 'startTracking')

      // Simulate tab activation
      const onActivatedCallback = vi.mocked(chrome.tabs.onActivated.addListener).mock.calls[0][0]
      await onActivatedCallback({ tabId: 1, windowId: 1 })

      expect(startTrackingSpy).toHaveBeenCalledWith(1, 'https://example.com', 'Example Page')
    })

    it('should stop tracking when a tab is closed', async () => {
      // Start tracking a tab
      pageTracker.startTracking(1, 'https://example.com', 'Example Page')

      const stopTrackingSpy = vi.spyOn(pageTracker, 'stopTracking')

      // Simulate tab removal
      const onRemovedCallback = vi.mocked(chrome.tabs.onRemoved.addListener).mock.calls[0][0]
      await onRemovedCallback(1, { windowId: 1, isWindowClosing: false })

      expect(stopTrackingSpy).toHaveBeenCalledWith(1)
    })

    it('should update tracking when tab URL changes', async () => {
      // Start tracking
      pageTracker.startTracking(1, 'https://example.com', 'Example Page')

      const stopTrackingSpy = vi.spyOn(pageTracker, 'stopTracking')
      const startTrackingSpy = vi.spyOn(pageTracker, 'startTracking')

      // Simulate URL change
      const onUpdatedCallback = vi.mocked(chrome.tabs.onUpdated.addListener).mock.calls[0][0]
      await onUpdatedCallback(1, { url: 'https://example.com/new' }, {
        id: 1,
        url: 'https://example.com/new',
        title: 'New Page',
      } as any)

      expect(stopTrackingSpy).toHaveBeenCalledWith(1)
      expect(startTrackingSpy).toHaveBeenCalledWith(1, 'https://example.com/new', 'New Page')
    })
  })

  describe('Duration calculation', () => {
    it('should calculate duration correctly', async () => {
      // Mock current time
      const startTime = 1000
      const endTime = 2000

      vi.spyOn(Date, 'now').mockReturnValueOnce(startTime).mockReturnValueOnce(endTime)

      // Start tracking
      pageTracker.startTracking(1, 'https://example.com', 'Example Page')

      // Stop tracking
      const visit = await pageTracker.stopTracking(1)

      expect(visit).toBeDefined()
      expect(visit!.duration).toBe(1) // 1 second
    })
  })

  describe('OGP data handling', () => {
    it('should include OGP data when received from content script', async () => {
      pageTracker.startTracking(1, 'https://example.com', 'Example Page')

      // Simulate OGP data from content script
      pageTracker.updateOGPData(1, {
        title: 'OGP Title',
        description: 'OGP Description',
        image: 'https://example.com/image.jpg',
      })

      const visit = await pageTracker.stopTracking(1)

      expect(visit?.ogp).toEqual({
        title: 'OGP Title',
        description: 'OGP Description',
        image: 'https://example.com/image.jpg',
      })
    })
  })
})

describe('DataSender', () => {
  let dataSender: DataSender

  beforeEach(() => {
    vi.clearAllMocks()
    dataSender = new DataSender()
    global.fetch = vi.fn()
  })

  it('should send data to the server with correct format', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      serverUrl: 'http://localhost:8765',
      authToken: 'test-token',
      enabled: true,
    })

    const mockResponse = {
      ok: true,
      json: async () => ({ success: true }),
    }
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

    const entry: BrowserHistoryEntry = {
      url: 'https://example.com',
      title: 'Example Page',
      visitedAt: new Date().toISOString(),
      duration: 30,
      ogp: {
        title: 'OGP Title',
      },
    }

    await dataSender.send(entry)

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8765/api/browser-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(entry),
    })
  })

  it('should not send data when extension is disabled', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      serverUrl: 'http://localhost:8765',
      authToken: 'test-token',
      enabled: false,
    })

    const entry: BrowserHistoryEntry = {
      url: 'https://example.com',
      title: 'Example Page',
      visitedAt: new Date().toISOString(),
      duration: 30,
    }

    await dataSender.send(entry)

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should handle network errors gracefully', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      serverUrl: 'http://localhost:8765',
      authToken: 'test-token',
      enabled: true,
    })

    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const entry: BrowserHistoryEntry = {
      url: 'https://example.com',
      title: 'Example Page',
      visitedAt: new Date().toISOString(),
      duration: 30,
    }

    await dataSender.send(entry)

    expect(consoleSpy).toHaveBeenCalledWith('Failed to send browser history:', expect.any(Error))

    consoleSpy.mockRestore()
  })
})
