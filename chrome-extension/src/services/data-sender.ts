import type {
  BrowserHistoryEntry,
  BrowserHistoryCreateEntry,
  BrowserHistoryUpdateEntry,
  ExtensionConfig,
} from '../types'

export class DataSender {
  async send(entry: BrowserHistoryEntry): Promise<void> {
    // Legacy method - still supported for compatibility
    await this.sendComplete(entry)
  }

  async sendComplete(entry: BrowserHistoryEntry): Promise<void> {
    try {
      console.log(`[DataSender] Getting config...`)
      const config = await this.getConfig()
      console.log(`[DataSender] Config:`, {
        serverUrl: config.serverUrl,
        enabled: config.enabled,
        hasToken: !!config.authToken,
      })

      if (!config.enabled) {
        console.log(`[DataSender] Extension disabled, not sending`)
        return
      }

      if (!config.authToken) {
        console.log(`[DataSender] No auth token, not sending`)
        return
      }

      console.log(
        `[DataSender] Sending complete entry to ${config.serverUrl}/api/browser-history:`,
        entry
      )
      const response = await fetch(`${config.serverUrl}/api/browser-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.authToken}`,
        },
        body: JSON.stringify(entry),
      })

      console.log(`[DataSender] Response status: ${response.status}`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[DataSender] Server error response:`, errorText)
        throw new Error(`Server responded with ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log('[DataSender] Browser history sent successfully:', result)
    } catch (error) {
      console.error('[DataSender] Failed to send browser history:', error)
      // TODO: Implement retry logic
    }
  }

  async create(entry: BrowserHistoryCreateEntry): Promise<string | null> {
    try {
      console.log(`[DataSender] Getting config for create...`)
      const config = await this.getConfig()
      console.log(`[DataSender] Config:`, {
        serverUrl: config.serverUrl,
        enabled: config.enabled,
        hasToken: !!config.authToken,
      })

      if (!config.enabled) {
        console.log(`[DataSender] Extension disabled, not creating`)
        return null
      }

      if (!config.authToken) {
        console.log(`[DataSender] No auth token, not creating`)
        return null
      }

      console.log(
        `[DataSender] Creating entry at ${config.serverUrl}/api/browser-history/create:`,
        entry
      )
      const response = await fetch(`${config.serverUrl}/api/browser-history/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.authToken}`,
        },
        body: JSON.stringify(entry),
      })

      console.log(`[DataSender] Create response status: ${response.status}`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[DataSender] Create server error response:`, errorText)
        throw new Error(`Server responded with ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log('[DataSender] Entry created successfully:', result)
      return result.entry?.id || null
    } catch (error) {
      console.error('[DataSender] Failed to create entry:', error)
      return null
    }
  }

  async update(update: BrowserHistoryUpdateEntry): Promise<boolean> {
    try {
      console.log(`[DataSender] Getting config for update...`)
      const config = await this.getConfig()

      if (!config.enabled || !config.authToken) {
        console.log(`[DataSender] Extension disabled or no auth token, not updating`)
        return false
      }

      console.log(
        `[DataSender] Updating entry at ${config.serverUrl}/api/browser-history/update:`,
        update
      )
      const response = await fetch(`${config.serverUrl}/api/browser-history/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.authToken}`,
        },
        body: JSON.stringify(update),
      })

      console.log(`[DataSender] Update response status: ${response.status}`)
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[DataSender] Update server error response:`, errorText)
        return false
      }

      const result = await response.json()
      console.log('[DataSender] Entry updated successfully:', result)
      return result.success
    } catch (error) {
      console.error('[DataSender] Failed to update entry:', error)
      return false
    }
  }

  private async getConfig(): Promise<ExtensionConfig> {
    const result = await chrome.storage.local.get(['serverUrl', 'authToken', 'enabled'])
    return {
      serverUrl: result.serverUrl || 'http://localhost:8765',
      authToken: result.authToken || '',
      enabled: result.enabled !== false, // Default to true
    }
  }
}
