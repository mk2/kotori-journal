interface ExtensionStatus {
  config: {
    serverUrl: string
    authToken: string
    enabled: boolean
    autoProcessingEnabled: boolean
  }
  activeVisits: number
}

class PopupController {
  private elements: {
    status: HTMLElement
    serverUrl: HTMLInputElement
    authToken: HTMLInputElement
    enabled: HTMLInputElement
    autoProcessingEnabled: HTMLInputElement
    testConnection: HTMLButtonElement
    saveSettings: HTMLButtonElement
    activeVisits: HTMLElement
  }

  constructor() {
    this.elements = {
      status: document.getElementById('status')!,
      serverUrl: document.getElementById('serverUrl')! as HTMLInputElement,
      authToken: document.getElementById('authToken')! as HTMLInputElement,
      enabled: document.getElementById('enabled')! as HTMLInputElement,
      autoProcessingEnabled: document.getElementById('autoProcessingEnabled')! as HTMLInputElement,
      testConnection: document.getElementById('testConnection')! as HTMLButtonElement,
      saveSettings: document.getElementById('saveSettings')! as HTMLButtonElement,
      activeVisits: document.getElementById('activeVisits')!,
    }

    this.init()
  }

  private async init(): Promise<void> {
    await this.loadStatus()
    this.setupEventListeners()
  }

  private async loadStatus(): Promise<void> {
    try {
      const status = await this.getStatus()
      this.updateUI(status)
    } catch (error) {
      console.error('Failed to load status:', error)
      this.showStatus('接続エラー', 'disconnected')
    }
  }

  private updateUI(status: ExtensionStatus): void {
    // Update form fields
    this.elements.serverUrl.value = status.config.serverUrl
    this.elements.authToken.value = status.config.authToken
    this.elements.enabled.checked = status.config.enabled
    this.elements.autoProcessingEnabled.checked = status.config.autoProcessingEnabled || false

    // Update stats
    this.elements.activeVisits.textContent = status.activeVisits.toString()

    // Update connection status
    if (status.config.authToken && status.config.enabled) {
      this.testConnection().then(connected => {
        if (connected) {
          this.showStatus('サーバーに接続済み', 'connected')
        } else {
          this.showStatus('サーバーに接続できません', 'disconnected')
        }
      })
    } else {
      this.showStatus('設定が必要です', 'disconnected')
    }
  }

  private setupEventListeners(): void {
    this.elements.testConnection.addEventListener('click', async () => {
      this.elements.testConnection.textContent = 'テスト中...'
      this.elements.testConnection.disabled = true

      try {
        const connected = await this.testConnection()
        if (connected) {
          this.showStatus('接続成功', 'connected')
        } else {
          this.showStatus('接続失敗', 'disconnected')
        }
      } catch {
        this.showStatus('接続エラー', 'disconnected')
      } finally {
        this.elements.testConnection.textContent = '接続テスト'
        this.elements.testConnection.disabled = false
      }
    })

    // Toggle switches
    this.elements.enabled.addEventListener('change', () => {
      console.log('Enabled toggle changed:', this.elements.enabled.checked)
    })

    this.elements.autoProcessingEnabled.addEventListener('change', () => {
      console.log('Auto processing toggle changed:', this.elements.autoProcessingEnabled.checked)
    })

    // Pattern management
    const openPatternsButton = document.getElementById('openPatterns')
    if (openPatternsButton) {
      openPatternsButton.addEventListener('click', () => {
        chrome.tabs.create({
          url: chrome.runtime.getURL('patterns.html'),
        })
      })
    }

    this.elements.saveSettings.addEventListener('click', async () => {
      this.elements.saveSettings.textContent = '保存中...'
      this.elements.saveSettings.disabled = true

      try {
        const config = {
          serverUrl: this.elements.serverUrl.value,
          authToken: this.elements.authToken.value,
          enabled: this.elements.enabled.checked,
          autoProcessingEnabled: this.elements.autoProcessingEnabled.checked,
        }

        await this.saveConfig(config)
        this.showStatus('設定を保存しました', 'connected')
      } catch {
        this.showStatus('保存に失敗しました', 'disconnected')
      } finally {
        this.elements.saveSettings.textContent = '保存'
        this.elements.saveSettings.disabled = false
      }
    })
  }

  private async getStatus(): Promise<ExtensionStatus> {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'get-status' }, resolve)
    })
  }

  private async saveConfig(config: any): Promise<void> {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'update-config', config }, resolve)
    })
  }

  private async testConnection(): Promise<boolean> {
    try {
      const serverUrl = this.elements.serverUrl.value || 'http://localhost:8765'
      const response = await fetch(`${serverUrl}/health`)
      return response.ok
    } catch {
      return false
    }
  }

  private showStatus(message: string, type: 'connected' | 'disconnected'): void {
    this.elements.status.textContent = message
    this.elements.status.className = `status ${type}`
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController()
})
