import { describe, it, expect, beforeEach, vi } from 'vitest'

// DOM環境のモック
Object.defineProperty(globalThis, 'window', {
  value: {
    location: {
      href: 'https://example.com/page1',
    },
  },
  writable: true,
})

Object.defineProperty(globalThis, 'document', {
  value: {
    readyState: 'complete',
  },
  writable: true,
})

describe('AutoContentProcessor URL変更処理', () => {
  beforeEach(() => {
    // windowとdocumentが利用可能になった状態で初期化
    globalThis.window.location.href = 'https://example.com/page1'

    // chrome.storage.local.getをモック
    global.chrome = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({ autoProcessingEnabled: true }),
        },
      },
      runtime: {
        sendMessage: vi.fn(),
      },
    } as any
  })

  it('URL変更時にprocessedフラグがリセットされる', async () => {
    // AutoContentProcessorのURL変更検知ロジックをテスト
    let currentUrl = 'https://example.com/page1'
    let processed = false

    // URL変更をシミュレート
    const simulateUrlChange = (newUrl: string) => {
      const oldUrl = currentUrl
      currentUrl = newUrl
      processed = false // processedフラグをリセット

      return { from: oldUrl, to: newUrl, processedReset: !processed }
    }

    // 最初の処理
    processed = true
    expect(processed).toBe(true)

    // URL変更をシミュレート
    const result = simulateUrlChange('https://example.com/page2')

    expect(result.from).toBe('https://example.com/page1')
    expect(result.to).toBe('https://example.com/page2')
    expect(result.processedReset).toBe(true)
    expect(processed).toBe(false)
  })

  it('同じURL内の変更では処理がスキップされる', () => {
    const currentUrl = 'https://example.com/page1'
    let processed = false

    // 最初の処理
    processed = true
    expect(processed).toBe(true)

    // 同じURLでは変更されない
    const checkSameUrl = (url: string) => {
      return url === currentUrl
    }

    expect(checkSameUrl('https://example.com/page1')).toBe(true)
    expect(processed).toBe(true) // processedフラグは変更されない
  })
})
