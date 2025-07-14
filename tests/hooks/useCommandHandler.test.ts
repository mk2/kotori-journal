/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, Mock, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCommandHandler } from '../../src/hooks/useCommandHandler'
import { SearchService } from '../../src/services/search-service'
import { JournalEntry } from '../../src/models/journal'

describe('useCommandHandler', () => {
  let mockJournalService: {
    isAITrigger: Mock
    isAIAvailable: Mock
    addEntry: Mock
    getEntries: Mock
    getJournalEntriesByDate: Mock
    generateAIResponse: Mock
  }
  let mockSearchService: SearchService
  let mockCommandRegistry: {
    findCommand: Mock
    executeCommand: Mock
  }
  let mockSetEntries: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    mockJournalService = {
      isAITrigger: vi.fn().mockReturnValue(false),
      isAIAvailable: vi.fn().mockReturnValue(true),
      addEntry: vi.fn().mockResolvedValue({
        id: '1',
        timestamp: new Date().toISOString(),
        content: 'Test entry',
        category: '仕事',
      }),
      getEntries: vi.fn().mockReturnValue([]),
      getJournalEntriesByDate: vi.fn().mockReturnValue([]),
      generateAIResponse: vi.fn().mockResolvedValue('AI response'),
      getStorageService: vi.fn().mockReturnValue({}),
    }

    mockSearchService = {} as SearchService

    mockCommandRegistry = {
      findCommand: vi.fn().mockReturnValue(null),
      executeCommand: vi.fn().mockResolvedValue({
        type: 'success',
        content: 'Command executed',
      }),
    }

    mockSetEntries = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const renderHookWithProps = (overrides = {}) => {
    const defaultProps = {
      journalService: mockJournalService as any,
      searchService: mockSearchService,
      commandRegistry: mockCommandRegistry as any,
      selectedCategory: '仕事',
      entries: [] as JournalEntry[],
      setEntries: mockSetEntries,
    }

    return renderHook(() => useCommandHandler({ ...defaultProps, ...overrides }))
  }

  it('should initialize with empty state', () => {
    const { result } = renderHookWithProps()

    expect(result.current.input).toBe('')
    expect(result.current.message).toBe('')
    expect(result.current.isProcessingAI).toBe(false)
    expect(result.current.loadingDots).toBe('')
  })

  it('should update input value', () => {
    const { result } = renderHookWithProps()

    act(() => {
      result.current.setInput('Test input')
    })

    expect(result.current.input).toBe('Test input')
  })

  it('should handle normal journal entry submission', async () => {
    const { result } = renderHookWithProps()

    act(() => {
      result.current.setInput('Normal journal entry')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(mockJournalService.addEntry).toHaveBeenCalledWith('Normal journal entry', '仕事')
    expect(mockSetEntries).toHaveBeenCalled()
    expect(result.current.input).toBe('')
    expect(result.current.message).toBe('エントリーを保存しました')
  })

  it('should not submit empty input', async () => {
    const { result } = renderHookWithProps()

    act(() => {
      result.current.setInput('   ')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(mockJournalService.addEntry).not.toHaveBeenCalled()
  })

  it('should handle command execution', async () => {
    const mockCommand = { name: 'test', pattern: /^\/test/ }
    mockCommandRegistry.findCommand.mockReturnValue(mockCommand)

    const { result } = renderHookWithProps()

    act(() => {
      result.current.setInput('/test command')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(mockCommandRegistry.findCommand).toHaveBeenCalledWith('/test command')
    expect(mockCommandRegistry.executeCommand).toHaveBeenCalled()
    expect(result.current.input).toBe('')
  })

  it('should handle command execution errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const mockCommand = { name: 'test', pattern: /^\/test/ }
    mockCommandRegistry.findCommand.mockReturnValue(mockCommand)
    mockCommandRegistry.executeCommand.mockRejectedValue(new Error('Command failed'))

    const { result } = renderHookWithProps()

    act(() => {
      result.current.setInput('/test command')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(result.current.message).toBe('コマンドの実行に失敗しました')
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('should handle AI trigger', async () => {
    mockJournalService.isAITrigger.mockReturnValue(true)

    const { result } = renderHookWithProps()

    act(() => {
      result.current.setInput('/? AI question')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(mockJournalService.isAITrigger).toHaveBeenCalledWith('/? AI question')
    expect(mockJournalService.addEntry).toHaveBeenCalledTimes(2) // 質問と応答
    expect(mockJournalService.generateAIResponse).toHaveBeenCalled()
    expect(result.current.input).toBe('')
  })

  it('should show error when AI is not available', async () => {
    mockJournalService.isAITrigger.mockReturnValue(true)
    mockJournalService.isAIAvailable.mockReturnValue(false)

    const { result } = renderHookWithProps()

    act(() => {
      result.current.setInput('/? AI question')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(result.current.message).toBe(
      'AI機能が利用できません。ANTHROPIC_API_KEYを設定してください。'
    )
    expect(mockJournalService.generateAIResponse).not.toHaveBeenCalled()
  })

  it('should handle AI processing errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockJournalService.isAITrigger.mockReturnValue(true)
    mockJournalService.generateAIResponse.mockRejectedValue(new Error('AI failed'))

    const { result } = renderHookWithProps()

    act(() => {
      result.current.setInput('/? AI question')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(result.current.message).toBe('AI処理でエラーが発生しました')
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it.skip('should show loading animation during AI processing', async () => {
    // このテストはAI処理の非同期動作に依存するためスキップ
    // 実際の統合テストで動作確認
  })

  it('should handle submission errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockJournalService.addEntry.mockRejectedValue(new Error('Save failed'))

    const { result } = renderHookWithProps()

    act(() => {
      result.current.setInput('Normal entry')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(result.current.message).toBe('保存に失敗しました')
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('should clear message after timeout', async () => {
    const { result } = renderHookWithProps()

    act(() => {
      result.current.setInput('Normal entry')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(result.current.message).toBe('エントリーを保存しました')

    // 2秒後にメッセージがクリアされる
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.message).toBe('')
  })
})
