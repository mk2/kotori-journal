import type { PageVisit, BrowserHistoryEntry, OGPData } from '../types'
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
      console.log(`[PageTracker] Tab activated: ${activeInfo.tabId}`)
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId)
        console.log(`[PageTracker] Tab info:`, { id: tab.id, url: tab.url, title: tab.title })
        if (tab.url && this.isValidUrl(tab.url)) {
          this.startTracking(tab.id!, tab.url, tab.title || 'Untitled')
        } else {
          console.log(`[PageTracker] Invalid URL: ${tab.url}`)
        }
      } catch (error) {
        console.error(`[PageTracker] Error getting tab info:`, error)
      }
    })

    // Tab removed
    chrome.tabs.onRemoved.addListener(async tabId => {
      console.log(`[PageTracker] Tab removed: ${tabId}`)
      await this.stopTracking(tabId)
    })

    // Tab updated (URL change)
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.url) {
        console.log(`[PageTracker] Tab ${tabId} URL changed to: ${changeInfo.url}`)
        if (tab.url && this.isValidUrl(tab.url)) {
          await this.stopTracking(tabId)
          this.startTracking(tabId, tab.url, tab.title || 'Untitled')
        } else {
          console.log(`[PageTracker] Invalid URL: ${tab.url}`)
        }
      }
    })

    // Listen for OGP data from content script
    chrome.runtime.onMessage.addListener((message, sender) => {
      console.log('[PageTracker] Received message:', message.type, message)
      if (message.type === 'ogp-data' && sender.tab?.id) {
        console.log('[PageTracker] Updating OGP data for tab', sender.tab.id, message.data)
        this.updateOGPData(sender.tab.id, message.data)
      }
    })
  }

  startTracking(tabId: number, url: string, title: string): void {
    console.log(`[PageTracker] Starting tracking for tab ${tabId}: ${title} (${url})`)
    this.activeVisits.set(tabId, {
      tabId,
      url,
      title,
      startTime: Date.now(),
    })
    console.log(`[PageTracker] Active visits: ${this.activeVisits.size}`)
  }

  async stopTracking(tabId: number): Promise<(PageVisit & { duration: number }) | undefined> {
    const visit = this.activeVisits.get(tabId)
    if (!visit) {
      console.log(`[PageTracker] No active visit found for tab ${tabId}`)
      return undefined
    }

    visit.endTime = Date.now()
    this.activeVisits.delete(tabId)

    // Calculate duration in seconds
    const duration = Math.round((visit.endTime - visit.startTime) / 1000)
    console.log(
      `[PageTracker] Stopped tracking tab ${tabId}: ${visit.title}, duration: ${duration}s`
    )

    // Send to server if duration is meaningful (> 0 seconds)
    if (duration > 0) {
      const entry: BrowserHistoryEntry = {
        url: visit.url,
        title: visit.title,
        visitedAt: new Date(visit.startTime).toISOString(),
        duration,
        ogp: visit.ogp,
      }

      console.log(`[PageTracker] Sending entry to server:`, entry)
      await this.dataSender.send(entry)
    } else {
      console.log(`[PageTracker] Duration too short (${duration}s), not sending`)
    }

    return { ...visit, duration }
  }

  updateOGPData(tabId: number, ogpData: OGPData): void {
    const visit = this.activeVisits.get(tabId)
    if (visit) {
      console.log(`[PageTracker] Updated OGP data for tab ${tabId}:`, ogpData)
      visit.ogp = ogpData
    } else {
      console.log(`[PageTracker] No active visit found for tab ${tabId} when updating OGP data`)
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
