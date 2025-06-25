import type { BrowserHistoryEntry, ExtensionConfig } from '../types'

export class DataSender {
  async send(entry: BrowserHistoryEntry): Promise<void> {
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

      console.log(`[DataSender] Sending to ${config.serverUrl}/api/browser-history:`, entry)
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

  private async getConfig(): Promise<ExtensionConfig> {
    const result = await chrome.storage.local.get(['serverUrl', 'authToken', 'enabled'])
    return {
      serverUrl: result.serverUrl || 'http://localhost:8765',
      authToken: result.authToken || '',
      enabled: result.enabled !== false, // Default to true
    }
  }
}
