export interface PageVisit {
  tabId: number
  url: string
  title: string
  startTime: number
  endTime?: number
  ogp?: OGPData
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

export interface ExtensionConfig {
  serverUrl: string
  authToken: string
  enabled: boolean
}
