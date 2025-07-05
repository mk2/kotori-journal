/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from '../../src/hooks/useKeyboardShortcuts'
import { useInput, useApp } from 'ink'

// inkのモック
vi.mock('ink', () => ({
  useInput: vi.fn(),
  useApp: vi.fn(),
}))

describe('useKeyboardShortcuts', () => {
  let mockExit: Mock
  let mockInputCallback: (input: string, key: any) => void

  beforeEach(() => {
    vi.clearAllMocks()

    mockExit = vi.fn()
    vi.mocked(useApp).mockReturnValue({ exit: mockExit } as any)

    // useInputのコールバックをキャプチャ
    vi.mocked(useInput).mockImplementation(callback => {
      mockInputCallback = callback
    })
  })

  const renderHookWithProps = (overrides = {}) => {
    const defaultProps = {
      mode: 'journal' as const,
      input: '',
      categories: ['仕事', '個人', 'アイデア'],
      selectedCategory: '仕事',
      setSelectedCategory: vi.fn(),
      setMode: vi.fn(),
    }

    return renderHook(() => useKeyboardShortcuts({ ...defaultProps, ...overrides }))
  }

  it('should register input handler', () => {
    renderHookWithProps()
    expect(useInput).toHaveBeenCalled()
  })

  it('should exit on Ctrl+C', () => {
    renderHookWithProps()

    mockInputCallback('c', { ctrl: true })
    expect(mockExit).toHaveBeenCalled()
  })

  it('should exit on Ctrl+D', () => {
    renderHookWithProps()

    mockInputCallback('d', { ctrl: true })
    expect(mockExit).toHaveBeenCalled()
  })

  it('should cycle through categories on Tab', () => {
    const setSelectedCategory = vi.fn()
    renderHookWithProps({ setSelectedCategory })

    mockInputCallback('', { tab: true })
    expect(setSelectedCategory).toHaveBeenCalledWith('個人')
  })

  it('should wrap around when cycling categories', () => {
    const setSelectedCategory = vi.fn()
    renderHookWithProps({
      selectedCategory: 'アイデア',
      setSelectedCategory,
    })

    mockInputCallback('', { tab: true })
    expect(setSelectedCategory).toHaveBeenCalledWith('仕事')
  })

  it('should switch to menu mode on Escape', () => {
    const setMode = vi.fn()
    renderHookWithProps({ setMode })

    mockInputCallback('', { escape: true })
    expect(setMode).toHaveBeenCalledWith('menu')
  })

  it('should switch to search mode on Ctrl+F when input is empty', () => {
    const setMode = vi.fn()
    renderHookWithProps({ setMode, input: '' })

    mockInputCallback('f', { ctrl: true })
    expect(setMode).toHaveBeenCalledWith('search')
  })

  it('should not switch to search mode on Ctrl+F when input has content', () => {
    const setMode = vi.fn()
    renderHookWithProps({ setMode, input: 'some text' })

    mockInputCallback('f', { ctrl: true })
    expect(setMode).not.toHaveBeenCalled()
  })

  it('should not process shortcuts in non-journal mode except exit', () => {
    const setMode = vi.fn()
    const setSelectedCategory = vi.fn()
    renderHookWithProps({
      mode: 'search',
      setMode,
      setSelectedCategory,
    })

    // タブキーは処理されない
    mockInputCallback('', { tab: true })
    expect(setSelectedCategory).not.toHaveBeenCalled()

    // Escapeキーは処理されない
    mockInputCallback('', { escape: true })
    expect(setMode).not.toHaveBeenCalled()

    // 終了キーは処理される
    mockInputCallback('c', { ctrl: true })
    expect(mockExit).toHaveBeenCalled()
  })

  it('should handle empty categories array', () => {
    const setSelectedCategory = vi.fn()
    renderHookWithProps({
      categories: [],
      setSelectedCategory,
    })

    // カテゴリが空の場合、タブキーを押しても何も起きない
    mockInputCallback('', { tab: true })
    expect(setSelectedCategory).not.toHaveBeenCalled()
  })

  it('should handle normal character input without any action', () => {
    const setMode = vi.fn()
    const setSelectedCategory = vi.fn()
    renderHookWithProps({
      setMode,
      setSelectedCategory,
    })

    // 通常の文字入力では何も起きない
    mockInputCallback('a', {})
    expect(setMode).not.toHaveBeenCalled()
    expect(setSelectedCategory).not.toHaveBeenCalled()
    expect(mockExit).not.toHaveBeenCalled()
  })
})
