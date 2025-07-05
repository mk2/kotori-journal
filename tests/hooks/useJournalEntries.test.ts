/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, Mock, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useJournalEntries } from '../../src/hooks/useJournalEntries'
import { JournalEntry } from '../../src/models/journal'

describe('useJournalEntries', () => {
  let mockJournalService: {
    getEntries: Mock
    refreshEntries: Mock
    getLastUpdateTime: Mock
  }
  let mockEntries: JournalEntry[]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    const now = new Date('2024-03-20T10:00:00Z')
    vi.setSystemTime(now)

    mockEntries = [
      {
        id: '1',
        timestamp: new Date('2024-03-20T09:00:00Z'),
        content: 'Morning entry',
        category: '仕事',
      },
      {
        id: '2',
        timestamp: new Date('2024-03-20T09:30:00Z'),
        content: 'Another entry',
        category: '個人',
      },
      {
        id: '3',
        timestamp: new Date('2024-03-19T10:00:00Z'),
        content: 'Yesterday entry',
        category: '仕事',
      },
    ]

    mockJournalService = {
      getEntries: vi.fn().mockReturnValue(mockEntries),
      refreshEntries: vi.fn().mockResolvedValue(mockEntries),
      getLastUpdateTime: vi.fn().mockResolvedValue(123456789),
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with entries from journal service', () => {
    const { result } = renderHook(() => useJournalEntries(mockJournalService as any, 123456789))

    expect(result.current.entries).toEqual(mockEntries)
    expect(mockJournalService.getEntries).toHaveBeenCalled()
  })

  it('should filter today entries correctly', () => {
    const { result } = renderHook(() => useJournalEntries(mockJournalService as any, 123456789))

    expect(result.current.todayEntries).toHaveLength(2)
    expect(result.current.todayEntries[0].id).toBe('1')
    expect(result.current.todayEntries[1].id).toBe('2')
  })

  it('should add entry correctly', () => {
    const { result } = renderHook(() => useJournalEntries(mockJournalService as any, 123456789))

    const newEntry: JournalEntry = {
      id: '4',
      timestamp: new Date(),
      content: 'New entry',
      category: '個人',
    }

    act(() => {
      result.current.addEntry(newEntry)
    })

    expect(result.current.entries).toHaveLength(4)
    expect(result.current.entries[3]).toEqual(newEntry)
  })

  it('should refresh entries when called', async () => {
    const newEntries = [
      ...mockEntries,
      {
        id: '4',
        timestamp: new Date(),
        content: 'Refreshed entry',
        category: '仕事',
      },
    ]

    mockJournalService.refreshEntries.mockResolvedValue(newEntries)

    const { result } = renderHook(() => useJournalEntries(mockJournalService as any, 123456789))

    await act(async () => {
      await result.current.refreshEntries()
    })

    expect(mockJournalService.refreshEntries).toHaveBeenCalled()
    expect(result.current.entries).toEqual(newEntries)
  })

  it('should handle refresh errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockJournalService.refreshEntries.mockRejectedValue(new Error('Refresh failed'))

    const { result } = renderHook(() => useJournalEntries(mockJournalService as any, 123456789))

    const initialEntries = [...result.current.entries]

    await act(async () => {
      await result.current.refreshEntries()
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to refresh entries:', expect.any(Error))
    // エラーが発生してもエントリーは変わらない
    expect(result.current.entries).toEqual(initialEntries)

    consoleErrorSpy.mockRestore()
  })

  it.skip('should periodically check for updates', async () => {
    // このテストはsetInterval動作に依存するためスキップ
    // 実際の統合テストで動作確認
  })

  it.skip('should not refresh if last update time has not changed', async () => {
    // このテストはsetInterval動作に依存するためスキップ
    // 実際の統合テストで動作確認
  })

  it('should handle null journal service gracefully', () => {
    const { result } = renderHook(() => useJournalEntries(null, 123456789))

    expect(result.current.entries).toEqual([])
    expect(result.current.todayEntries).toEqual([])
  })

  describe('polling interval stability', () => {
    it('should maintain stable polling interval when internalLastUpdateTime changes', async () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

      // Mock getLastUpdateTime to return different values to trigger updates
      let currentTime = 123456789
      mockJournalService.getLastUpdateTime.mockImplementation(() => {
        currentTime += 1000
        return Promise.resolve(currentTime)
      })

      renderHook(() => useJournalEntries(mockJournalService as any, 123456789))

      // Wait for initial setup
      await act(async () => {
        await vi.runOnlyPendingTimersAsync()
      })

      const initialIntervalCount = setIntervalSpy.mock.calls.length
      const initialClearCount = clearIntervalSpy.mock.calls.length

      // Advance time to trigger multiple polling cycles
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000) // 3 seconds = 3 polling cycles
      })

      // The interval should not be recreated multiple times
      // There should be only one setInterval call (for the initial setup)
      expect(setIntervalSpy).toHaveBeenCalledTimes(initialIntervalCount)
      // No additional clearInterval calls should happen during polling
      expect(clearIntervalSpy).toHaveBeenCalledTimes(initialClearCount)

      setIntervalSpy.mockRestore()
      clearIntervalSpy.mockRestore()
    })

    it('should update internalLastUpdateTime when lastUpdateTime prop changes', async () => {
      const initialLastUpdateTime = 123456789
      const { rerender } = renderHook(
        ({ lastUpdateTime }) => useJournalEntries(mockJournalService as any, lastUpdateTime),
        { initialProps: { lastUpdateTime: initialLastUpdateTime } }
      )

      // Mock getLastUpdateTime to return a value that would trigger an update
      const newTime = 123457000
      mockJournalService.getLastUpdateTime.mockResolvedValue(newTime - 1)

      // Change the lastUpdateTime prop
      const updatedLastUpdateTime = 123457000
      rerender({ lastUpdateTime: updatedLastUpdateTime })

      // Advance time to trigger a polling cycle
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })

      // Verify that the service was called (indicating internal state was updated)
      expect(mockJournalService.getLastUpdateTime).toHaveBeenCalled()
    })

    it('should continue polling correctly after prop changes', async () => {
      const initialLastUpdateTime = 123456789
      const { rerender } = renderHook(
        ({ lastUpdateTime }) => useJournalEntries(mockJournalService as any, lastUpdateTime),
        { initialProps: { lastUpdateTime: initialLastUpdateTime } }
      )

      // Mock getLastUpdateTime to return increasing values
      let pollCount = 0
      mockJournalService.getLastUpdateTime.mockImplementation(() => {
        pollCount++
        return Promise.resolve(123456789 + pollCount * 1000)
      })

      // Change the lastUpdateTime prop
      const updatedLastUpdateTime = 123457000
      rerender({ lastUpdateTime: updatedLastUpdateTime })

      // Advance time to trigger multiple polling cycles
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })

      // Verify that polling continued after prop change
      expect(pollCount).toBeGreaterThan(1)
      expect(mockJournalService.getLastUpdateTime).toHaveBeenCalledTimes(pollCount)
    })

    it('should not create memory leaks from interval recreation', async () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

      // Mock getLastUpdateTime to return different values to trigger updates
      let updateCount = 0
      mockJournalService.getLastUpdateTime.mockImplementation(() => {
        updateCount++
        return Promise.resolve(123456789 + updateCount * 1000)
      })

      const { unmount } = renderHook(() => useJournalEntries(mockJournalService as any, 123456789))

      // Wait for initial setup
      await act(async () => {
        await vi.runOnlyPendingTimersAsync()
      })

      const initialIntervalCount = setIntervalSpy.mock.calls.length

      // Advance time to trigger multiple updates
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000) // 5 seconds
      })

      // Should still have only the initial interval
      expect(setIntervalSpy).toHaveBeenCalledTimes(initialIntervalCount)

      // Unmount to trigger cleanup
      unmount()

      // Should have cleared the interval exactly once
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1)

      setIntervalSpy.mockRestore()
      clearIntervalSpy.mockRestore()
    })
  })
})
