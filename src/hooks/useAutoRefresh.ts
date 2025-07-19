import React, { useEffect, useRef, useState } from 'react'
import { JournalService } from '../services/journal-service'
import { JournalEntry } from '../models/journal'

export const useAutoRefresh = (
  journalService: JournalService | null,
  setEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>
) => {
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)
  const scrollPositionRef = useRef<number>(0)

  const saveScrollPosition = () => {
    if (process.stdout.isTTY) {
      scrollPositionRef.current = process.stdout.rows || 0
    }
  }

  const restoreScrollPosition = () => {
    if (process.stdout.isTTY && scrollPositionRef.current > 0) {
      // 簡単な実装: 画面をクリアせずに同じ位置に保つ
      // より高度な実装が必要な場合は、外部ライブラリを検討
    }
  }

  useEffect(() => {
    const initUpdateTime = async () => {
      if (journalService) {
        const initialUpdateTime = await journalService.getLastUpdateTime()
        setLastUpdateTime(initialUpdateTime)
      }
    }
    initUpdateTime()
  }, [journalService])

  useEffect(() => {
    if (!journalService) return

    const interval = globalThis.setInterval(async () => {
      try {
        const currentUpdateTime = await journalService.getLastUpdateTime()

        if (currentUpdateTime > lastUpdateTime) {
          saveScrollPosition()
          const latestEntries = await journalService.refreshEntries()
          setEntries(latestEntries)
          setLastUpdateTime(currentUpdateTime)
          setTimeout(restoreScrollPosition, 0)
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to refresh entries:', error)
      }
    }, 1000)

    return () => globalThis.clearInterval(interval)
  }, [journalService, lastUpdateTime, setEntries])
}
