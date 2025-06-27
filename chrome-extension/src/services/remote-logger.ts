export class RemoteLogger {
  private queue: LogEntry[] = []
  private isProcessing = false
  private serverUrl?: string
  private authToken?: string

  constructor() {
    this.init()
  }

  private async init() {
    // Load config from storage
    const config = await chrome.storage.local.get(['serverUrl', 'authToken', 'enabled'])
    this.serverUrl = config.serverUrl
    this.authToken = config.authToken

    // Listen for config changes
    chrome.storage.onChanged.addListener(changes => {
      if (changes.serverUrl) {
        this.serverUrl = changes.serverUrl.newValue
      }
      if (changes.authToken) {
        this.authToken = changes.authToken.newValue
      }
    })

    // Process queue periodically
    setInterval(() => this.processQueue(), 1000)
  }

  log(level: LogLevel, message: string, data?: any) {
    this.queue.push({
      level,
      message,
      data,
      timestamp: Date.now(),
    })

    // Also log to console
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
    console[consoleMethod](`[RemoteLogger] ${message}`, data || '')
  }

  error(message: string, data?: any) {
    this.log('error', message, data)
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data)
  }

  info(message: string, data?: any) {
    this.log('info', message, data)
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data)
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0 || !this.serverUrl || !this.authToken) {
      return
    }

    this.isProcessing = true

    try {
      // Send logs in batches
      const batch = this.queue.splice(0, 10) // Take up to 10 logs at a time

      for (const entry of batch) {
        try {
          await fetch(`${this.serverUrl}/api/chrome-extension/log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.authToken}`,
            },
            body: JSON.stringify(entry),
          })
        } catch (error) {
          // If sending fails, put it back in the queue
          this.queue.unshift(entry)
          console.error('[RemoteLogger] Failed to send log:', error)
          break
        }
      }
    } finally {
      this.isProcessing = false
    }
  }
}

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: number
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

// Create singleton instance
export const remoteLogger = new RemoteLogger()
