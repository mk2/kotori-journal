import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ContentProcessor } from '../src/services/content-processor'
import { JournalService } from '../src/services/journal-service'
import { ContentPatternManager } from '../src/models/content-pattern'
import { ClaudeAIService } from '../src/services/claude-ai'
import path from 'path'
import { tmpdir } from 'os'

describe('自動コンテンツ処理ジャーナル機能', () => {
  let contentProcessor: ContentProcessor
  let journalService: JournalService
  let patternManager: ContentPatternManager
  let tempDir: string

  beforeEach(() => {
    // テスト用の一時ディレクトリを設定
    tempDir = path.join(tmpdir(), 'kotori-test-' + Date.now())
    process.env.KOTORI_DATA_PATH = tempDir
    process.env.ANTHROPIC_API_KEY = 'test-api-key'

    journalService = new JournalService(tempDir)
    patternManager = new ContentPatternManager()
    contentProcessor = new ContentProcessor(journalService, patternManager)

    // JournalServiceのaddEntryをモック
    vi.spyOn(journalService, 'addEntry').mockImplementation(
      async (content, category = 'デフォルト', type = 'entry', metadata = {}) => {
        const entry = {
          id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: new Date(),
          content,
          category,
          type,
          metadata,
        }
        return entry
      }
    )

    // ClaudeAIServiceのprocessAIRequestをモック
    vi.spyOn(ClaudeAIService.prototype, 'processAIRequest').mockResolvedValue('処理された結果')
  })

  it('自動コンテンツ処理開始時にジャーナルエントリが作成される', async () => {
    // パターンをモック
    const mockPattern = {
      id: 'pattern-1',
      name: 'テストパターン',
      urlPattern: 'https://example.com/*',
      prompt: 'テスト用プロンプト: {content}',
      category: 'テストカテゴリ',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.spyOn(patternManager, 'getPatternById').mockReturnValue(mockPattern)

    const testRequest = {
      url: 'https://example.com/test',
      title: 'テストページ',
      content: 'テストコンテンツです。',
      patternId: 'pattern-1',
    }

    await contentProcessor.processContent(testRequest)

    // ジャーナルエントリが2回作成されることを確認（開始時と完了時）
    expect(journalService.addEntry).toHaveBeenCalledTimes(2)

    // 1回目の呼び出し（開始時）を確認
    const startCall = (journalService.addEntry as any).mock.calls[0]
    expect(startCall[0]).toContain('自動コンテンツ処理を開始')
    expect(startCall[0]).toContain(testRequest.title)
    expect(startCall[1]).toBe('自動処理')
    expect(startCall[2]).toBe('entry')
    expect(startCall[3]).toMatchObject({
      url: testRequest.url,
      title: testRequest.title,
      patternId: 'pattern-1',
      patternName: 'テストパターン',
      status: 'processing',
    })

    // 2回目の呼び出し（完了時）を確認
    const completeCall = (journalService.addEntry as any).mock.calls[1]
    expect(completeCall[0]).toContain('自動コンテンツ処理完了')
    expect(completeCall[0]).toContain('処理された結果')
    expect(completeCall[1]).toBe('AI処理コンテンツ')
    expect(completeCall[2]).toBe('entry')
    expect(completeCall[3]).toMatchObject({
      url: testRequest.url,
      title: testRequest.title,
      patternId: 'pattern-1',
      patternName: 'テストパターン',
      status: 'completed',
    })
  })

  it('自動コンテンツ処理失敗時にエラージャーナルエントリが作成される', async () => {
    const mockPattern = {
      id: 'pattern-1',
      name: 'テストパターン',
      urlPattern: 'https://example.com/*',
      prompt: 'テスト用プロンプト: {content}',
      category: 'テストカテゴリ',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.spyOn(patternManager, 'getPatternById').mockReturnValue(mockPattern)
    vi.spyOn(ClaudeAIService.prototype, 'processAIRequest').mockRejectedValue(
      new Error('AI処理エラー')
    )

    const testRequest = {
      url: 'https://example.com/test',
      title: 'テストページ',
      content: 'テストコンテンツです。',
      patternId: 'pattern-1',
    }

    const result = await contentProcessor.processContent(testRequest)

    // 処理が失敗することを確認
    expect(result.success).toBe(false)
    expect(result.error).toBe('AI処理エラー')

    // 開始時とエラー時のジャーナルエントリが作成されることを確認
    expect(journalService.addEntry).toHaveBeenCalledTimes(2)

    // 1回目の呼び出し（開始時）を確認
    const startCall = (journalService.addEntry as any).mock.calls[0]
    expect(startCall[0]).toContain('自動コンテンツ処理を開始')
    expect(startCall[1]).toBe('自動処理')
    expect(startCall[3]).toMatchObject({
      status: 'processing',
    })

    // 2回目の呼び出し（エラー時）を確認
    const errorCall = (journalService.addEntry as any).mock.calls[1]
    expect(errorCall[0]).toContain('自動コンテンツ処理エラー')
    expect(errorCall[0]).toContain('AI処理エラー')
    expect(errorCall[1]).toBe('自動処理エラー')
    expect(errorCall[3]).toMatchObject({
      status: 'error',
      error: 'AI処理エラー',
    })
  })
})
