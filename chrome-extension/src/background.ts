import { PageTracker } from './services/page-tracker'
import { DataSender } from './services/data-sender'
import { ContentProcessingService } from './services/content-processing-service'
import { remoteLogger } from './services/remote-logger'

// Initialize services
remoteLogger.info('[Background] Initializing services...')
const dataSender = new DataSender()
const pageTracker = new PageTracker(dataSender)
const contentProcessingService = new ContentProcessingService()
remoteLogger.info('[Background] Services initialized')

// Check active tabs immediately
setTimeout(checkAndStartTrackingActiveTabs, 1000)

// Extension lifecycle
chrome.runtime.onInstalled.addListener(() => {
  remoteLogger.info('[Background] Kotori Journal Browser History extension installed')

  // Set default configuration
  chrome.storage.local.get(
    ['serverUrl', 'authToken', 'enabled', 'autoProcessingEnabled'],
    result => {
      const config = {
        serverUrl: result.serverUrl || 'http://localhost:8765',
        authToken: result.authToken || '',
        enabled: result.enabled !== false,
        autoProcessingEnabled: result.autoProcessingEnabled !== false,
      }

      remoteLogger.info('[Background] Setting default config:', config)
      chrome.storage.local.set(config)
    }
  )
})

// Start tracking current active tab on startup
chrome.runtime.onStartup.addListener(async () => {
  remoteLogger.info('[Background] Extension startup, checking active tabs')
  await checkAndStartTrackingActiveTabs()
})

// Also check when the extension is installed/enabled
chrome.runtime.onInstalled.addListener(async () => {
  remoteLogger.info('[Background] Extension installed/enabled, checking active tabs')
  await checkAndStartTrackingActiveTabs()
})

async function checkAndStartTrackingActiveTabs() {
  try {
    const tabs = await chrome.tabs.query({ active: true })
    remoteLogger.info('[Background] Found active tabs:', { count: tabs.length })
    for (const tab of tabs) {
      if (tab.id && tab.url) {
        remoteLogger.info('[Background] Active tab:', {
          id: tab.id,
          url: tab.url,
          title: tab.title,
        })
        // Manually trigger tracking if it's a valid URL
        if (tab.url.startsWith('http')) {
          remoteLogger.info('[Background] Starting manual tracking for active tab')
          pageTracker.startTracking(tab.id, tab.url, tab.title || 'Untitled')
        }
      }
    }
  } catch (error) {
    remoteLogger.error('[Background] Error checking active tabs:', {
      error: error instanceof Error ? error.message : error,
    })
  }
}

// Handle messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  remoteLogger.info('[Background] Received message:', { type: message.type, message })

  if (message.type === 'get-status') {
    chrome.storage.local.get(
      ['serverUrl', 'authToken', 'enabled', 'autoProcessingEnabled'],
      config => {
        const status = {
          config,
          activeVisits: pageTracker.getActiveVisitsCount(),
        }
        remoteLogger.info('[Background] Sending status:', status)
        sendResponse(status)
      }
    )
    return true // Will respond asynchronously
  }

  if (message.type === 'update-config') {
    remoteLogger.info('[Background] Updating config:', message.config)
    chrome.storage.local.set(message.config, () => {
      remoteLogger.info('[Background] Config updated')
      sendResponse({ success: true })
    })
    return true
  }

  if (message.type === 'ogp-data') {
    remoteLogger.info('[Background] Received OGP data from content script:', message.data)
    // This is handled by PageTracker
  }

  if (message.type === 'remote-log') {
    // Forward log messages from content scripts to remote logger
    const { level, logMessage, data } = message
    if (level === 'info') {
      remoteLogger.info(`[ContentScript] ${logMessage}`, data)
    } else if (level === 'error') {
      remoteLogger.error(`[ContentScript] ${logMessage}`, data)
    } else if (level === 'warn') {
      remoteLogger.warn(`[ContentScript] ${logMessage}`, data)
    } else if (level === 'debug') {
      remoteLogger.debug(`[ContentScript] ${logMessage}`, data)
    }
    return
  }

  if (message.type === 'auto-process-content') {
    remoteLogger.info('[Background] Received auto-process request', {
      url: message.data?.url,
      contentLength: message.data?.content?.length,
    })

    // データを直接サーバーに送信して自動処理を依頼
    chrome.storage.local.get(
      ['serverUrl', 'authToken', 'enabled', 'autoProcessingEnabled'],
      async config => {
        remoteLogger.info('[Background] Current config:', {
          enabled: config.enabled,
          autoProcessingEnabled: config.autoProcessingEnabled,
          hasAuthToken: !!config.authToken,
          serverUrl: config.serverUrl,
        })

        if (!config.enabled) {
          remoteLogger.info('[Background] Extension disabled, skipping auto-processing')
          return
        }

        if (!config.autoProcessingEnabled) {
          remoteLogger.info('[Background] Auto-processing disabled, skipping')
          return
        }

        if (!config.authToken) {
          remoteLogger.info('[Background] No auth token configured, skipping auto-processing')
          return
        }

        try {
          remoteLogger.info('[Background] Sending auto-processing request to server')
          const response = await fetch(`${config.serverUrl}/api/auto-content-processing`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.authToken}`,
            },
            body: JSON.stringify(message.data),
          })

          const result = await response.json()
          remoteLogger.info('[Background] Server response:', result)

          if (response.ok && result.success) {
            remoteLogger.info('[Background] Auto-processing successful:', {
              processed: result.processed,
              total: result.total,
            })
            // Optional: Show notification or update badge
          } else {
            remoteLogger.warn('[Background] Auto-processing failed or no patterns matched:', result)
          }
        } catch (error) {
          remoteLogger.error('[Background] Error in auto-processing:', {
            error: error instanceof Error ? error.message : error,
          })
        }
      }
    )
  }

  if (message.type === 'get-patterns') {
    contentProcessingService.getAllPatterns().then(patterns => {
      sendResponse({ patterns })
    })
    return true
  }

  if (message.type === 'create-pattern') {
    const { name, urlPattern, prompt, enabled } = message.data
    contentProcessingService.createPattern(name, urlPattern, prompt, enabled).then(pattern => {
      sendResponse({ pattern })
    })
    return true
  }

  if (message.type === 'update-pattern') {
    const { id, updates } = message.data
    contentProcessingService.updatePattern(id, updates).then(success => {
      sendResponse({ success })
    })
    return true
  }

  if (message.type === 'delete-pattern') {
    const { id } = message.data
    contentProcessingService.deletePattern(id).then(success => {
      sendResponse({ success })
    })
    return true
  }
})
