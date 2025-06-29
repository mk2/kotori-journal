import { StorageService } from '../src/services/storage'
import { JournalEntry } from '../src/models/journal'
import { promises as fs } from 'fs'
import path from 'path'
import { beforeEach, afterEach, describe, it, expect } from 'vitest'

describe('StorageService - AI Conversation in Daily Report', () => {
  let storage: StorageService
  let testDataPath: string

  beforeEach(async () => {
    testDataPath = path.join(__dirname, 'test-data-ai-conversation')
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

  it('should include AI questions and responses in daily report', async () => {
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
        content: '今日の天気はどうでしょうか？',
        category: 'AI',
        type: 'ai_question',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        metadata: {},
      },
      {
        id: '3',
        content:
          '今日は晴れていて、とても良い天気ですね！\n散歩にでも出かけてみてはいかがでしょうか？',
        category: 'AI',
        type: 'ai_response',
        timestamp: new Date('2024-01-15T10:31:00Z'),
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
    expect(reportContent).toContain('## AI会話')
    expect(reportContent).toContain('### 10:30 - 質問')
    expect(reportContent).toContain('今日の天気はどうでしょうか？')
    expect(reportContent).toContain('### 10:31 - 応答')
    expect(reportContent).toContain('今日は晴れていて、とても良い天気ですね！')
    expect(reportContent).toContain('散歩にでも出かけてみてはいかがでしょうか？')

    // 通常のエントリーも含まれていることを確認
    expect(reportContent).toContain('## 日記')
    expect(reportContent).toContain('通常のジャーナルエントリー')

    // AIカテゴリセクションは表示されない（AI会話セクションに含まれるため）
    expect(reportContent).not.toMatch(/^## AI$/m)
  })

  it('should handle multiple AI conversations in daily report', async () => {
    const testDate = new Date('2024-01-15T10:00:00Z')

    const entries: JournalEntry[] = [
      {
        id: '1',
        content: '最初の質問です',
        category: 'AI',
        type: 'ai_question',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        metadata: {},
      },
      {
        id: '2',
        content: '最初の応答です',
        category: 'AI',
        type: 'ai_response',
        timestamp: new Date('2024-01-15T10:01:00Z'),
        metadata: {},
      },
      {
        id: '3',
        content: '二番目の質問です',
        category: 'AI',
        type: 'ai_question',
        timestamp: new Date('2024-01-15T11:00:00Z'),
        metadata: {},
      },
      {
        id: '4',
        content: '二番目の応答です',
        category: 'AI',
        type: 'ai_response',
        timestamp: new Date('2024-01-15T11:01:00Z'),
        metadata: {},
      },
    ]

    await storage.generateDailyReport(testDate, entries)

    const reportPath = path.join(testDataPath, '2024', '01', '15.md')
    const reportContent = await fs.readFile(reportPath, 'utf-8')

    expect(reportContent).toContain('### 10:00 - 質問')
    expect(reportContent).toContain('最初の質問です')
    expect(reportContent).toContain('### 10:01 - 応答')
    expect(reportContent).toContain('最初の応答です')
    expect(reportContent).toContain('### 11:00 - 質問')
    expect(reportContent).toContain('二番目の質問です')
    expect(reportContent).toContain('### 11:01 - 応答')
    expect(reportContent).toContain('二番目の応答です')
  })

  it('should handle orphaned questions and responses', async () => {
    const testDate = new Date('2024-01-15T10:00:00Z')

    const entries: JournalEntry[] = [
      {
        id: '1',
        content: '応答のない質問',
        category: 'AI',
        type: 'ai_question',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        metadata: {},
      },
      {
        id: '2',
        content: '質問のない応答',
        category: 'AI',
        type: 'ai_response',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        metadata: {},
      },
    ]

    await storage.generateDailyReport(testDate, entries)

    const reportPath = path.join(testDataPath, '2024', '01', '15.md')
    const reportContent = await fs.readFile(reportPath, 'utf-8')

    expect(reportContent).toContain('### 10:00 - 質問')
    expect(reportContent).toContain('応答のない質問')
    expect(reportContent).toContain('### 10:30 - 応答')
    expect(reportContent).toContain('質問のない応答')
  })

  it('should handle mixed AI conversations and auto-processed content', async () => {
    const testDate = new Date('2024-01-15T10:00:00Z')

    const entries: JournalEntry[] = [
      {
        id: '1',
        content: 'ユーザーからの質問',
        category: 'AI',
        type: 'ai_question',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        metadata: {},
      },
      {
        id: '2',
        content: 'ユーザーへの応答',
        category: 'AI',
        type: 'ai_response',
        timestamp: new Date('2024-01-15T10:01:00Z'),
        metadata: {},
      },
      {
        id: '3',
        content: '自動コンテンツ処理完了: 自動処理されたページ\n\n自動処理の結果です',
        category: 'AI処理コンテンツ',
        type: 'entry',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        metadata: {
          url: 'https://example.com/page',
          title: '自動処理されたページ',
          patternName: 'テストパターン',
          processedBy: 'claude-ai',
        },
      },
    ]

    await storage.generateDailyReport(testDate, entries)

    const reportPath = path.join(testDataPath, '2024', '01', '15.md')
    const reportContent = await fs.readFile(reportPath, 'utf-8')

    // AI会話セクション
    expect(reportContent).toContain('## AI会話')
    expect(reportContent).toContain('### 10:00 - 質問')
    expect(reportContent).toContain('ユーザーからの質問')
    expect(reportContent).toContain('### 10:01 - 応答')
    expect(reportContent).toContain('ユーザーへの応答')

    // 自動処理セクション
    expect(reportContent).toContain('## 自動処理されたコンテンツ（AI応答）')
    expect(reportContent).toContain('### 10:30 - 自動処理されたページ')
    expect(reportContent).toContain('自動処理の結果です')
  })

  it('should not include AI section when no AI conversations exist', async () => {
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

    expect(reportContent).not.toContain('## AI会話')
    expect(reportContent).toContain('## 日記')
    expect(reportContent).toContain('通常のエントリー')
  })

  it('should handle AI category entries that are not conversations', async () => {
    const testDate = new Date('2024-01-15T10:00:00Z')

    const entries: JournalEntry[] = [
      {
        id: '1',
        content: 'AI関連の通常エントリー',
        category: 'AI',
        type: 'entry', // ai_question でも ai_response でもない
        timestamp: testDate,
        metadata: {},
      },
      {
        id: '2',
        content: 'AI質問',
        category: 'AI',
        type: 'ai_question',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        metadata: {},
      },
    ]

    await storage.generateDailyReport(testDate, entries)

    const reportPath = path.join(testDataPath, '2024', '01', '15.md')
    const reportContent = await fs.readFile(reportPath, 'utf-8')

    // AI会話セクション
    expect(reportContent).toContain('## AI会話')
    expect(reportContent).toContain('### 10:30 - 質問')
    expect(reportContent).toContain('AI質問')

    // 通常のAIエントリーは別セクションで表示
    expect(reportContent).toContain('## AI')
    expect(reportContent).toContain('AI関連の通常エントリー')
  })
})
