export interface PageVisit {
  tabId: number
  url: string
  title: string
  startTime: number
  endTime?: number
  ogp?: OGPData
  entryId?: string // Journal entry ID from server
}

export interface OGPData {
  title?: string
  description?: string
  image?: string
}

export interface BrowserHistoryEntry {
  url: string
  title: string
  visitedAt: string
  duration: number
  ogp?: OGPData
}

export interface BrowserHistoryCreateEntry {
  url: string
  title: string
  visitedAt: string
  ogp?: OGPData
}

export interface BrowserHistoryUpdateEntry {
  entryId: string
  duration: number
}

export interface ExtensionConfig {
  serverUrl: string
  authToken: string
  enabled: boolean
}
