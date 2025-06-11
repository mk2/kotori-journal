import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { JournalService } from '../../src/services/journal-service'

describe('Temp File Persistence Integration Tests', () => {
  let testDataPath: string

  beforeEach(async () => {
    testDataPath = path.join(os.tmpdir(), `kotori-test-${Date.now()}`)
    await fs.mkdir(testDataPath, { recursive: true })
  })

  afterEach(async () => {
    try {
      await fs.rm(testDataPath, { recursive: true, force: true })
    } catch (error) {
      // エラーは無視
    }
  })

  describe('Multi-day scenario', () => {
    it('should handle entries across multiple days correctly', async () => {
      // 独立したテスト環境を使用
      const isolatedPath = path.join(os.tmpdir(), `kotori-multi-day-${Date.now()}`)
      await fs.mkdir(isolatedPath, { recursive: true })
      
      try {
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const twoDaysAgo = new Date(today)
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

        // 一時ファイルを手動で作成（複数日のエントリー）
        const tempDir = path.join(isolatedPath, '.temp')
        await fs.mkdir(tempDir, { recursive: true })

      const entries = [
        {
          id: 'two-days-ago-1',
          content: '一昨日のエントリー',
          category: '仕事',
          timestamp: twoDaysAgo.toISOString()
        },
        {
          id: 'yesterday-1',
          content: '昨日のエントリー1',
          category: '仕事',
          timestamp: yesterday.toISOString()
        },
        {
          id: 'yesterday-2',
          content: '昨日のエントリー2',
          category: 'プライベート',
          timestamp: yesterday.toISOString()
        },
        {
          id: 'today-1',
          content: '今日のエントリー',
          category: '仕事',
          timestamp: today.toISOString()
        }
      ]

      // 各エントリーを一時ファイルに保存
      for (const entry of entries) {
        await fs.writeFile(
          path.join(tempDir, `${entry.id}.json`),
          JSON.stringify(entry, null, 2)
        )
      }

        // 初期化実行
        const service = new JournalService(isolatedPath)
        await service.initialize()

        // 全エントリーがメモリに読み込まれることを確認
        const allEntries = service.getEntries()
        expect(allEntries).toHaveLength(4)

        // 今日のエントリーのみ一時ファイルに残っていることを確認
        const tempFiles = await fs.readdir(tempDir)
        const remainingJsonFiles = tempFiles.filter(f => f.endsWith('.json'))
        expect(remainingJsonFiles).toHaveLength(1)
        expect(remainingJsonFiles[0]).toBe('today-1.json')

        // 今日のエントリーを取得
        const todayEntries = service.getEntriesByDate(today)
        expect(todayEntries).toHaveLength(1)
        expect(todayEntries[0].content).toBe('今日のエントリー')

        // 昨日のエントリーも正しく取得できることを確認
        const yesterdayEntries = service.getEntriesByDate(yesterday)
        expect(yesterdayEntries).toHaveLength(2)
      } finally {
        try {
          await fs.rm(isolatedPath, { recursive: true, force: true })
        } catch {}
      }
    })
  })

  describe('App restart simulation', () => {
    it('should simulate real app restart scenario', async () => {
      // 独立したテストディレクトリを使用
      const isolatedTestPath = path.join(os.tmpdir(), `kotori-isolated-${Date.now()}`)
      await fs.mkdir(isolatedTestPath, { recursive: true })
      
      try {
        // === Day 1: アプリ起動、エントリー追加、終了 ===
        let service = new JournalService(isolatedTestPath)
        await service.initialize()
        
        await service.addEntry('朝の計画', '仕事')
        await service.addEntry('プロジェクト開始', '仕事')
        await service.addEntry('ランチ', 'プライベート')
        
        let entries = service.getEntries()
        expect(entries).toHaveLength(3)

        // === アプリ再起動 ===
        service = new JournalService(isolatedTestPath)
        await service.initialize()
        
        // エントリーが復元されることを確認
        entries = service.getEntries()
        expect(entries).toHaveLength(3)
        const contents = entries.map(e => e.content)
        expect(contents).toContain('朝の計画')
        expect(contents).toContain('プロジェクト開始')
        expect(contents).toContain('ランチ')

        // === さらにエントリー追加 ===
        await service.addEntry('夕方の作業', '仕事')
        await service.addEntry('一日の振り返り', 'プライベート')
        
        entries = service.getEntries()
        expect(entries).toHaveLength(5)

        // === 再度アプリ再起動 ===
        service = new JournalService(isolatedTestPath)
        await service.initialize()
        
        // 全エントリーが保持されていることを確認
        entries = service.getEntries()
        expect(entries).toHaveLength(5)

        // 一時ファイルが正しく管理されていることを確認
        const tempDir = path.join(isolatedTestPath, '.temp')
        const tempFiles = await fs.readdir(tempDir)
        const jsonFiles = tempFiles.filter(f => f.endsWith('.json'))
        expect(jsonFiles).toHaveLength(5) // 今日のエントリー全て
      } finally {
        // クリーンアップ
        try {
          await fs.rm(isolatedTestPath, { recursive: true, force: true })
        } catch {}
      }
    })
  })

  describe('Cross-day boundary', () => {
    it('should handle day boundary correctly', async () => {
      // 昨日の深夜のエントリーを設定
      const lateYesterday = new Date()
      lateYesterday.setDate(lateYesterday.getDate() - 1)
      lateYesterday.setHours(23, 59, 59)

      // 今日の早朝のエントリーを設定
      const earlyToday = new Date()
      earlyToday.setHours(0, 0, 1)

      // 一時ファイルを手動で作成
      const tempDir = path.join(testDataPath, '.temp')
      await fs.mkdir(tempDir, { recursive: true })

      const yesterdayEntry = {
        id: 'late-yesterday',
        content: '昨日の深夜作業',
        category: '仕事',
        timestamp: lateYesterday.toISOString()
      }

      const todayEntry = {
        id: 'early-today',
        content: '今日の早朝作業',
        category: '仕事',
        timestamp: earlyToday.toISOString()
      }

      await fs.writeFile(
        path.join(tempDir, 'late-yesterday.json'),
        JSON.stringify(yesterdayEntry, null, 2)
      )
      await fs.writeFile(
        path.join(tempDir, 'early-today.json'),
        JSON.stringify(todayEntry, null, 2)
      )

      // 初期化実行
      const service = new JournalService(testDataPath)
      await service.initialize()

      // 両方のエントリーがメモリに読み込まれることを確認
      const allEntries = service.getEntries()
      expect(allEntries.length).toBeGreaterThanOrEqual(2)

      // 今日のエントリーのみ一時ファイルに残っていることを確認
      const tempFiles = await fs.readdir(tempDir)
      const remainingJsonFiles = tempFiles.filter(f => f.endsWith('.json'))
      expect(remainingJsonFiles).toHaveLength(1)
      expect(remainingJsonFiles[0]).toBe('early-today.json')

      // 日付別取得も正しく動作することを確認
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const todayEntries = service.getEntriesByDate(today)
      const yesterdayEntries = service.getEntriesByDate(yesterday)

      expect(todayEntries).toHaveLength(1)
      expect(todayEntries[0].content).toBe('今日の早朝作業')
      
      expect(yesterdayEntries).toHaveLength(1)
      expect(yesterdayEntries[0].content).toBe('昨日の深夜作業')
    })
  })
})