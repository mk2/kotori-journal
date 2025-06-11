import { describe, it, expect, beforeEach } from 'vitest'
import { Journal } from '../../src/models/journal'

describe('Journal AI Integration', () => {
  let journal: Journal

  beforeEach(() => {
    journal = new Journal()
  })

  it('should add entries with different types', () => {
    const normalEntry = journal.addEntry('通常のエントリー', '仕事')
    const aiQuestion = journal.addEntry('？今日はどうでしたか', 'AI', 'ai_question')
    const aiResponse = journal.addEntry('今日は良い一日でした', 'AI', 'ai_response')

    expect(normalEntry.type).toBe('entry')
    expect(aiQuestion.type).toBe('ai_question')
    expect(aiResponse.type).toBe('ai_response')
  })

  it('should filter AI conversations from journal entries for reports', () => {
    const today = new Date()

    // 通常のエントリーを追加
    journal.addEntry('朝の会議', '仕事')
    journal.addEntry('ランチ', 'プライベート')

    // AI会話を追加
    journal.addEntry('？今日はどうでしたか', 'AI', 'ai_question')
    journal.addEntry('今日は充実した一日でした', 'AI', 'ai_response')

    const allEntries = journal.getEntriesByDate(today)
    const journalOnlyEntries = journal.getJournalEntriesByDate(today)

    expect(allEntries).toHaveLength(4)
    expect(journalOnlyEntries).toHaveLength(2)

    // ジャーナル専用エントリーにはAI会話が含まれていないことを確認
    expect(journalOnlyEntries.every(entry => !entry.type || entry.type === 'entry')).toBe(true)
  })

  it('should include AI conversations in all entries search', () => {
    journal.addEntry('プロジェクト完了', '仕事')
    journal.addEntry('？プロジェクトについて教えて', 'AI', 'ai_question')
    journal.addEntry('プロジェクトは成功しました', 'AI', 'ai_response')

    const searchResults = journal.searchEntries('プロジェクト')

    // 検索では全てのエントリータイプが対象になる
    expect(searchResults).toHaveLength(3)
  })
})
