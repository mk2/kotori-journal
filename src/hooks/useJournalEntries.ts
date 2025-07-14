import React, { useState, useEffect, useRef, useCallback } from 'react'
import { JournalEntry } from '../models/journal'
import { JournalService } from '../services/journal-service'

interface UseJournalEntriesResult {
  entries: JournalEntry[]
  todayEntries: JournalEntry[]
  setEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>
  addEntry: (entry: JournalEntry) => void
  refreshEntries: () => Promise<void>
}

export const useJournalEntries = (
  journalService: JournalService | null,
  lastUpdateTime: number
): UseJournalEntriesResult => {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [internalLastUpdateTime, setInternalLastUpdateTime] = useState<number>(lastUpdateTime)
  const scrollPositionRef = useRef<number>(0)

  // スクロール位置を保存する関数
  const saveScrollPosition = useCallback(() => {
    if (process.stdout.isTTY) {
      scrollPositionRef.current = process.stdout.rows || 0
    }
  }, [])

  // スクロール位置を復元する関数
  const restoreScrollPosition = useCallback(() => {
    if (process.stdout.isTTY && scrollPositionRef.current > 0) {
      // 簡単な実装: 画面をクリアせずに同じ位置に保つ
      // より高度な実装が必要な場合は、外部ライブラリを検討
    }
  }, [])

  // エントリーを追加する関数
  const addEntry = useCallback((entry: JournalEntry) => {
    setEntries(prev => [...prev, entry])
  }, [])

  // エントリーを更新する関数
  const refreshEntries = useCallback(async () => {
    if (!journalService) return

    try {
      const latestEntries = await journalService.refreshEntries()
      setEntries(latestEntries)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to refresh entries:', error)
    }
  }, [journalService])

  // 初期エントリーの設定
  useEffect(() => {
    if (journalService) {
      setEntries(journalService.getEntries())
    }
  }, [journalService])

  // lastUpdateTimeプロパティが変更された場合にinternalLastUpdateTimeを更新
  useEffect(() => {
    setInternalLastUpdateTime(lastUpdateTime)
  }, [lastUpdateTime])

  // 1秒ごとにデータ変更をチェックし、変更があった場合のみ更新するuseEffect
  useEffect(() => {
    if (!journalService) return

    const interval = globalThis.setInterval(async () => {
      try {
        // 最後の更新時刻を取得
        const currentUpdateTime = await journalService.getLastUpdateTime()

        // 前回の更新時刻と比較して変更があった場合のみ更新
        if (currentUpdateTime > internalLastUpdateTime) {
          // スクロール位置を保存
          saveScrollPosition()

          const latestEntries = await journalService.refreshEntries()
          setEntries(latestEntries)
          setInternalLastUpdateTime(currentUpdateTime)

          // 次のレンダリング後にスクロール位置を復元
          setTimeout(restoreScrollPosition, 0)
        }
      } catch (error) {
        // エラーが発生した場合は現在のエントリーを保持
        // eslint-disable-next-line no-console
        console.error('Failed to refresh entries:', error)
      }
    }, 1000)

    return () => globalThis.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journalService, saveScrollPosition, restoreScrollPosition])

  // 今日のエントリーをフィルタリング
  const todayEntries = entries.filter(entry => {
    const today = new Date()
    const entryDate = new Date(entry.timestamp)
    return (
      entryDate.getDate() === today.getDate() &&
      entryDate.getMonth() === today.getMonth() &&
      entryDate.getFullYear() === today.getFullYear()
    )
  })

  return {
    entries,
    todayEntries,
    setEntries,
    addEntry,
    refreshEntries,
  }
}
