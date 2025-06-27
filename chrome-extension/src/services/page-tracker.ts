import type {
  PageVisit,
  BrowserHistoryCreateEntry,
  BrowserHistoryUpdateEntry,
  OGPData,
} from '../types'
import { DataSender } from './data-sender'

export class PageTracker {
  private activeVisits: Map<number, PageVisit> = new Map()
  private dataSender: DataSender

  constructor(dataSender: DataSender) {
    this.dataSender = dataSender
    this.setupListeners()
  }

  private setupListeners(): void {
    // Tab activated
    chrome.tabs.onActivated.addListener(async activeInfo => {
      // コンソール出力は無効化
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId)
        // コンソール出力は無効化
        if (tab.url && this.isValidUrl(tab.url)) {
          this.startTracking(tab.id!, tab.url, tab.title || 'Untitled')
        } else {
          // コンソール出力は無効化
        }
      } catch {
        // コンソール出力は無効化
      }
    })

    // Tab removed
    chrome.tabs.onRemoved.addListener(async tabId => {
      // コンソール出力は無効化
      await this.stopTracking(tabId)
    })

    // Tab updated (URL change)
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.url) {
        // コンソール出力は無効化
        if (tab.url && this.isValidUrl(tab.url)) {
          await this.stopTracking(tabId)
          this.startTracking(tabId, tab.url, tab.title || 'Untitled')
        } else {
          // コンソール出力は無効化
        }
      }
    })

    // Listen for OGP data from content script
    chrome.runtime.onMessage.addListener((message, sender) => {
      // コンソール出力は無効化
      if (message.type === 'ogp-data' && sender.tab?.id) {
        // コンソール出力は無効化
        this.updateOGPData(sender.tab.id, message.data)
      }
    })
  }

  startTracking(tabId: number, url: string, title: string): void {
    // コンソール出力は無効化

    const visit: PageVisit = {
      tabId,
      url,
      title,
      startTime: Date.now(),
    }

    this.activeVisits.set(tabId, visit)
    // コンソール出力は無効化

    // Immediately create journal entry
    this.createJournalEntry(tabId)
  }

  async stopTracking(tabId: number): Promise<(PageVisit & { duration: number }) | undefined> {
    const visit = this.activeVisits.get(tabId)
    if (!visit) {
      // コンソール出力は無効化
      return undefined
    }

    visit.endTime = Date.now()
    this.activeVisits.delete(tabId)

    // Calculate duration in seconds
    const duration = Math.round((visit.endTime - visit.startTime) / 1000)
    // コンソール出力は無効化

    // If we have an entryId, update the existing entry with duration
    if (visit.entryId && duration > 0) {
      const update: BrowserHistoryUpdateEntry = {
        entryId: visit.entryId,
        duration,
      }

      // コンソール出力は無効化
      const success = await this.dataSender.update(update)

      if (success) {
        // コンソール出力は無効化
      } else {
        // コンソール出力は無効化
      }
    } else if (!visit.entryId) {
      // コンソール出力は無効化
    } else {
      // コンソール出力は無効化
    }

    return { ...visit, duration }
  }

  updateOGPData(tabId: number, ogpData: OGPData): void {
    const visit = this.activeVisits.get(tabId)
    if (visit) {
      // コンソール出力は無効化
      visit.ogp = ogpData

      // If we haven't created the journal entry yet, do it now with OGP data
      if (!visit.entryId) {
        this.createJournalEntry(tabId)
      }
    } else {
      // コンソール出力は無効化
    }
  }

  private async createJournalEntry(tabId: number): Promise<void> {
    const visit = this.activeVisits.get(tabId)
    if (!visit || visit.entryId) {
      return // Already created or visit not found
    }

    const createEntry: BrowserHistoryCreateEntry = {
      url: visit.url,
      title: visit.title,
      visitedAt: new Date(visit.startTime).toISOString(),
      ogp: visit.ogp,
    }

    // コンソール出力は無効化
    const entryId = await this.dataSender.create(createEntry)

    if (entryId) {
      visit.entryId = entryId
      // コンソール出力は無効化
    } else {
      // コンソール出力は無効化
    }
  }

  getActiveVisitsCount(): number {
    return this.activeVisits.size
  }

  private isValidUrl(url: string): boolean {
    // Filter out chrome:// and other internal URLs
    return url.startsWith('http://') || url.startsWith('https://')
  }
}
