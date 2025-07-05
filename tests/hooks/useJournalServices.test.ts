/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useJournalServices } from '../../src/hooks/useJournalServices'
import { JournalService } from '../../src/services/journal-service'
import { SearchService } from '../../src/services/search-service'
import { CommandRegistry } from '../../src/services/command-registry'
import { PluginManager } from '../../src/services/plugin-manager'
import { Config } from '../../src/utils/config'

// モックの設定
vi.mock('../../src/services/journal-service')
vi.mock('../../src/services/search-service')
vi.mock('../../src/services/command-registry')
vi.mock('../../src/services/plugin-manager')
vi.mock('../../src/commands/ai-commands', () => ({
  QuestionCommand: vi.fn(),
  SummaryCommand: vi.fn(),
  AdviceCommand: vi.fn(),
  HelpCommand: vi.fn(),
}))

describe('useJournalServices', () => {
  let mockConfig: Config
  let mockJournalService: {
    initialize: Mock
    getCategories: Mock
    getLastUpdateTime: Mock
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockConfig = {
      dataPath: '/test/data',
      defaultCategories: ['仕事', '個人'],
      enableAI: true,
      aiModel: 'claude-3-opus-20240229',
      httpServerPort: 3000,
      enablePlugins: true,
    }

    mockJournalService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getCategories: vi.fn().mockReturnValue(['仕事', '個人', 'アイデア']),
      getLastUpdateTime: vi.fn().mockResolvedValue(123456789),
    }

    vi.mocked(JournalService).mockImplementation(() => mockJournalService as any)
    vi.mocked(SearchService).mockImplementation(() => ({}) as any)
    vi.mocked(CommandRegistry).mockImplementation(
      () =>
        ({
          register: vi.fn(),
        }) as any
    )
    vi.mocked(PluginManager).mockImplementation(
      () =>
        ({
          initialize: vi.fn().mockResolvedValue(undefined),
        }) as any
    )
  })

  it('should initialize services correctly', async () => {
    const { result } = renderHook(() => useJournalServices(mockConfig))

    // 初期状態
    expect(result.current.isReady).toBe(false)
    expect(result.current.journalService).toBe(null)
    expect(result.current.searchService).toBe(null)
    expect(result.current.commandRegistry).toBe(null)
    expect(result.current.pluginManager).toBe(null)

    // 初期化完了を待つ
    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    // サービスが初期化されていることを確認
    expect(result.current.journalService).not.toBe(null)
    expect(result.current.searchService).not.toBe(null)
    expect(result.current.commandRegistry).not.toBe(null)
    expect(result.current.pluginManager).not.toBe(null)
    expect(result.current.categories).toEqual(['仕事', '個人', 'アイデア'])
    expect(result.current.lastUpdateTime).toBe(123456789)
  })

  it('should call JournalService.initialize', async () => {
    renderHook(() => useJournalServices(mockConfig))

    await waitFor(() => {
      expect(mockJournalService.initialize).toHaveBeenCalled()
    })
  })

  it('should register AI commands', async () => {
    const mockRegister = vi.fn()
    vi.mocked(CommandRegistry).mockImplementation(
      () =>
        ({
          register: mockRegister,
        }) as any
    )

    renderHook(() => useJournalServices(mockConfig))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledTimes(4) // 4つのAIコマンド
    })
  })

  it('should initialize PluginManager', async () => {
    const mockPluginInitialize = vi.fn().mockResolvedValue(undefined)
    vi.mocked(PluginManager).mockImplementation(
      () =>
        ({
          initialize: mockPluginInitialize,
        }) as any
    )

    renderHook(() => useJournalServices(mockConfig))

    await waitFor(() => {
      expect(mockPluginInitialize).toHaveBeenCalled()
    })
  })

  it('should handle initialization errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockJournalService.initialize.mockRejectedValue(new Error('Init failed'))

    const { result } = renderHook(() => useJournalServices(mockConfig))

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to initialize service:',
        expect.any(Error)
      )
    })

    // エラーが発生してもisReadyはfalseのまま
    expect(result.current.isReady).toBe(false)

    consoleErrorSpy.mockRestore()
  })
})
