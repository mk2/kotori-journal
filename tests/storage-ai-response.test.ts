import { StorageService } from '../src/services/storage'
import { JournalEntry } from '../src/models/journal'
import { promises as fs } from 'fs'
import path from 'path'
import { beforeEach, afterEach, describe, it, expect } from 'vitest'

describe('StorageService - AI Response in Daily Report', () => {
  let storage: StorageService
  let testDataPath: string

  beforeEach(async () => {
    testDataPath = path.join(__dirname, 'test-data-ai-response')
    storage = new StorageService(testDataPath)

    // テストディレクトリを作成
    await fs.mkdir(testDataPath, { recursive: true })
  })

  afterEach(async () => {
    // テストディレクトリを削除
    try {
      await fs.rm(testDataPath, { recursive: true, force: true })
    } catch {
      // エラーは無視
    }
  })

  it('should include AI responses in daily report', async () => {
    const testDate = new Date('2024-01-15T10:00:00Z')

    // テスト用のエントリーを作成
    const entries: JournalEntry[] = [
      {
        id: '1',
        content: '通常のジャーナルエントリー',
        category: '日記',
        type: 'entry',
        timestamp: testDate,
        metadata: {},
      },
      {
        id: '2',
        content:
          '自動コンテンツ処理完了: GitHubのIssue\n\nこれはAI応答の内容です。\nGitHubのIssueについて分析しました。',
        category: 'AI処理コンテンツ',
        type: 'entry',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        metadata: {
          url: 'https://github.com/example/repo/issues/123',
          title: 'GitHubのIssue',
          patternId: 'github-issue',
          patternName: 'GitHub Issue処理',
          status: 'completed',
          processedBy: 'claude-ai',
          startedAt: '2024-01-15T10:29:00Z',
          completedAt: '2024-01-15T10:30:00Z',
        },
      },
      {
        id: '3',
        content: '別の通常エントリー',
        category: '作業',
        type: 'entry',
        timestamp: new Date('2024-01-15T11:00:00Z'),
        metadata: {},
      },
    ]

    // 日報を生成
    await storage.generateDailyReport(testDate, entries)

    // 生成されたファイルを確認
    const reportPath = path.join(testDataPath, '2024', '01', '15.md')
    const reportContent = await fs.readFile(reportPath, 'utf-8')

    // 日報の内容を検証
    expect(reportContent).toContain('# 2024年01月15日の記録')
    expect(reportContent).toContain('## 自動処理されたコンテンツ（AI応答）')
    expect(reportContent).toContain('### 10:30 - GitHubのIssue')
    expect(reportContent).toContain('- URL: https://github.com/example/repo/issues/123')
    expect(reportContent).toContain('- 処理パターン: GitHub Issue処理')
    expect(reportContent).toContain('これはAI応答の内容です。')
    expect(reportContent).toContain('GitHubのIssueについて分析しました。')

    // 通常のエントリーも含まれていることを確認
    expect(reportContent).toContain('## 日記')
    expect(reportContent).toContain('通常のジャーナルエントリー')
    expect(reportContent).toContain('## 作業')
    expect(reportContent).toContain('別の通常エントリー')
  })

  it('should handle multiple AI responses in daily report', async () => {
    const testDate = new Date('2024-01-15T10:00:00Z')

    const entries: JournalEntry[] = [
      {
        id: '1',
        content: '自動コンテンツ処理完了: 最初のAI応答\n\n最初のAI応答内容です。',
        category: 'AI処理コンテンツ',
        type: 'entry',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        metadata: {
          url: 'https://example.com/page1',
          title: '最初のAI応答',
          patternName: 'パターン1',
          processedBy: 'claude-ai',
        },
      },
      {
        id: '2',
        content: '自動コンテンツ処理完了: 二番目のAI応答\n\n二番目のAI応答内容です。',
        category: 'AI処理コンテンツ',
        type: 'entry',
        timestamp: new Date('2024-01-15T11:00:00Z'),
        metadata: {
          url: 'https://example.com/page2',
          title: '二番目のAI応答',
          patternName: 'パターン2',
          processedBy: 'claude-ai',
        },
      },
    ]

    await storage.generateDailyReport(testDate, entries)

    const reportPath = path.join(testDataPath, '2024', '01', '15.md')
    const reportContent = await fs.readFile(reportPath, 'utf-8')

    expect(reportContent).toContain('### 10:00 - 最初のAI応答')
    expect(reportContent).toContain('### 11:00 - 二番目のAI応答')
    expect(reportContent).toContain('最初のAI応答内容です。')
    expect(reportContent).toContain('二番目のAI応答内容です。')
  })

  it('should not include AI responses without processedBy metadata in AI section', async () => {
    const testDate = new Date('2024-01-15T10:00:00Z')

    const entries: JournalEntry[] = [
      {
        id: '1',
        content: '自動コンテンツ処理完了: 処理メタデータなし\n\nこれは含まれるべきではない',
        category: 'AI処理コンテンツ',
        type: 'entry',
        timestamp: testDate,
        metadata: {
          url: 'https://example.com/page',
          title: '処理メタデータなし',
          patternName: 'パターン',
          // processedBy がない
        },
      },
    ]

    await storage.generateDailyReport(testDate, entries)

    const reportPath = path.join(testDataPath, '2024', '01', '15.md')
    const reportContent = await fs.readFile(reportPath, 'utf-8')

    // AI応答セクションには含まれない
    expect(reportContent).not.toContain('## 自動処理されたコンテンツ（AI応答）')
    // 通常のカテゴリとして表示される
    expect(reportContent).toContain('## AI処理コンテンツ')
    expect(reportContent).toContain('自動コンテンツ処理完了: 処理メタデータなし')
  })

  it('should handle empty AI responses gracefully', async () => {
    const testDate = new Date('2024-01-15T10:00:00Z')

    const entries: JournalEntry[] = [
      {
        id: '1',
        content: '通常のエントリー',
        category: '日記',
        type: 'entry',
        timestamp: testDate,
        metadata: {},
      },
    ]

    await storage.generateDailyReport(testDate, entries)

    const reportPath = path.join(testDataPath, '2024', '01', '15.md')
    const reportContent = await fs.readFile(reportPath, 'utf-8')

    expect(reportContent).not.toContain('## 自動処理されたコンテンツ（AI応答）')
    expect(reportContent).toContain('## 日記')
    expect(reportContent).toContain('通常のエントリー')
  })
})
