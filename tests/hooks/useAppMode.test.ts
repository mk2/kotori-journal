/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAppMode } from '../../src/hooks/useAppMode'

describe('useAppMode', () => {
  it('should initialize with default mode', () => {
    const { result } = renderHook(() => useAppMode())
    expect(result.current.mode).toBe('journal')
  })

  it('should initialize with custom mode', () => {
    const { result } = renderHook(() => useAppMode('search'))
    expect(result.current.mode).toBe('search')
  })

  it('should switch to journal mode', () => {
    const { result } = renderHook(() => useAppMode('menu'))

    act(() => {
      result.current.switchToJournal()
    })

    expect(result.current.mode).toBe('journal')
  })

  it('should switch to search mode', () => {
    const { result } = renderHook(() => useAppMode())

    act(() => {
      result.current.switchToSearch()
    })

    expect(result.current.mode).toBe('search')
  })

  it('should switch to category mode', () => {
    const { result } = renderHook(() => useAppMode())

    act(() => {
      result.current.switchToCategory()
    })

    expect(result.current.mode).toBe('category')
  })

  it('should switch to menu mode', () => {
    const { result } = renderHook(() => useAppMode())

    act(() => {
      result.current.switchToMenu()
    })

    expect(result.current.mode).toBe('menu')
  })

  it('should update mode using setMode', () => {
    const { result } = renderHook(() => useAppMode())

    act(() => {
      result.current.setMode('category')
    })

    expect(result.current.mode).toBe('category')
  })

  it('should handle multiple mode switches', () => {
    const { result } = renderHook(() => useAppMode())

    act(() => {
      result.current.switchToSearch()
    })
    expect(result.current.mode).toBe('search')

    act(() => {
      result.current.switchToCategory()
    })
    expect(result.current.mode).toBe('category')

    act(() => {
      result.current.switchToMenu()
    })
    expect(result.current.mode).toBe('menu')

    act(() => {
      result.current.switchToJournal()
    })
    expect(result.current.mode).toBe('journal')
  })
})
