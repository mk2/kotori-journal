import { vi } from 'vitest'

// Setup global Chrome API mocks
global.chrome = {
  tabs: {
    onActivated: { addListener: vi.fn() },
    onRemoved: { addListener: vi.fn() },
    onUpdated: { addListener: vi.fn() },
    get: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  runtime: {
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn(),
    onInstalled: { addListener: vi.fn() },
  },
} as any
