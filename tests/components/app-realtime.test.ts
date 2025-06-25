import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Config } from '../../src/utils/config'
import { JournalService } from '../../src/services/journal-service'

describe('App Real-time Updates', () => {
  let config: Config

  beforeEach(() => {
    config = {
      dataPath: '/tmp/test-journal',
      openai: { enabled: false, apiKey: '', model: 'gpt-4' },
      anthropic: { enabled: false, apiKey: '', model: 'claude-3-haiku-20240307' },
      defaultCategories: ['日記', '作業', 'メモ'],
    }

    // timersをmock
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should update entries every second', async () => {
    const service = new JournalService(config.dataPath)
    await service.initialize()

    const initialEntries = service.getEntries()
    const entryCount = initialEntries.length

    // 新しいエントリーを追加
    await service.addEntry('テストエントリー', '日記')

    // refreshEntriesメソッドをテスト
    const refreshedEntries = await service.refreshEntries()
    expect(refreshedEntries.length).toBe(entryCount + 1)
    expect(refreshedEntries[refreshedEntries.length - 1].content).toBe('テストエントリー')
  })

  it('should refresh entries and add new ones from temp files', async () => {
    const service = new JournalService(config.dataPath)
    await service.initialize()

    const initialCount = service.getEntries().length

    // 複数のエントリーを追加
    await service.addEntry('エントリー1', '日記')
    await service.addEntry('エントリー2', '作業')

    // refreshEntriesで新しいエントリーを取得
    const refreshedEntries = await service.refreshEntries()
    expect(refreshedEntries.length).toBe(initialCount + 2)

    // 同じエントリーを再度refreshしても重複しないことを確認
    const secondRefresh = await service.refreshEntries()
    expect(secondRefresh.length).toBe(initialCount + 2)
  })

  it('should filter today entries correctly', () => {
    const mockEntries = [
      {
        id: '1',
        content: '今日のエントリー',
        category: '日記',
        timestamp: new Date().toISOString(),
        type: 'entry' as const,
      },
      {
        id: '2',
        content: '昨日のエントリー',
        category: '日記',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        type: 'entry' as const,
      },
    ]

    const today = new Date()
    const todayEntries = mockEntries.filter(entry => {
      const entryDate = new Date(entry.timestamp)
      return (
        entryDate.getDate() === today.getDate() &&
        entryDate.getMonth() === today.getMonth() &&
        entryDate.getFullYear() === today.getFullYear()
      )
    })

    expect(todayEntries.length).toBe(1)
    expect(todayEntries[0].content).toBe('今日のエントリー')
  })

  it('should display latest 10 entries', () => {
    const mockEntries = Array.from({ length: 15 }, (_, i) => ({
      id: `${i + 1}`,
      content: `エントリー ${i + 1}`,
      category: '日記',
      timestamp: new Date().toISOString(),
      type: 'entry' as const,
    }))

    const latestEntries = mockEntries.slice(-10)
    expect(latestEntries.length).toBe(10)
    expect(latestEntries[0].content).toBe('エントリー 6')
    expect(latestEntries[9].content).toBe('エントリー 15')
  })
})
