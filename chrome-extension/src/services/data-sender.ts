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
      // コンソール出力は無効化
      const config = await this.getConfig()
      // コンソール出力は無効化

      if (!config.enabled) {
        // コンソール出力は無効化
        return
      }

      if (!config.authToken) {
        // コンソール出力は無効化
        return
      }

      // コンソール出力は無効化
      const response = await fetch(`${config.serverUrl}/api/browser-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.authToken}`,
        },
        body: JSON.stringify(entry),
      })

      // コンソール出力は無効化
      if (!response.ok) {
        const errorText = await response.text()
        // コンソール出力は無効化
        throw new Error(`Server responded with ${response.status}: ${errorText}`)
      }

      await response.json() // レスポンスを消費するが変数には保存しない
      // コンソール出力は無効化
    } catch {
      // コンソール出力は無効化
      // TODO: Implement retry logic
    }
  }

  async create(entry: BrowserHistoryCreateEntry): Promise<string | null> {
    try {
      // コンソール出力は無効化
      const config = await this.getConfig()
      // コンソール出力は無効化

      if (!config.enabled) {
        // コンソール出力は無効化
        return null
      }

      if (!config.authToken) {
        // コンソール出力は無効化
        return null
      }

      // コンソール出力は無効化
      const response = await fetch(`${config.serverUrl}/api/browser-history/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.authToken}`,
        },
        body: JSON.stringify(entry),
      })

      // コンソール出力は無効化
      if (!response.ok) {
        const errorText = await response.text()
        // コンソール出力は無効化
        throw new Error(`Server responded with ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      // コンソール出力は無効化
      return result.entry?.id || null
    } catch {
      // コンソール出力は無効化
      return null
    }
  }

  async update(update: BrowserHistoryUpdateEntry): Promise<boolean> {
    try {
      // コンソール出力は無効化
      const config = await this.getConfig()

      if (!config.enabled || !config.authToken) {
        // コンソール出力は無効化
        return false
      }

      // コンソール出力は無効化
      const response = await fetch(`${config.serverUrl}/api/browser-history/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.authToken}`,
        },
        body: JSON.stringify(update),
      })

      // コンソール出力は無効化
      if (!response.ok) {
        await response.text() // エラーテキストを読み取るが変数には保存しない
        // コンソール出力は無効化
        return false
      }

      const result = await response.json()
      // コンソール出力は無効化
      return result.success
    } catch {
      // コンソール出力は無効化
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
