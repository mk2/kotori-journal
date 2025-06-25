import { PageTracker } from './services/page-tracker'
import { DataSender } from './services/data-sender'
import { ContentProcessingService } from './services/content-processing-service'

// Initialize services
console.log('[Background] Initializing services...')
const dataSender = new DataSender()
const pageTracker = new PageTracker(dataSender)
const contentProcessingService = new ContentProcessingService()
console.log('[Background] Services initialized')

// Check active tabs immediately
setTimeout(checkAndStartTrackingActiveTabs, 1000)

// Extension lifecycle
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Kotori Journal Browser History extension installed')

  // Set default configuration
  chrome.storage.local.get(['serverUrl', 'authToken', 'enabled'], result => {
    const config = {
      serverUrl: result.serverUrl || 'http://localhost:8765',
      authToken: result.authToken || '',
      enabled: result.enabled !== false,
    }

    console.log('[Background] Setting default config:', config)
    chrome.storage.local.set(config)
  })
})

// Start tracking current active tab on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Background] Extension startup, checking active tabs')
  await checkAndStartTrackingActiveTabs()
})

// Also check when the extension is installed/enabled
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Background] Extension installed/enabled, checking active tabs')
  await checkAndStartTrackingActiveTabs()
})

async function checkAndStartTrackingActiveTabs() {
  try {
    const tabs = await chrome.tabs.query({ active: true })
    console.log('[Background] Found active tabs:', tabs.length)
    for (const tab of tabs) {
      if (tab.id && tab.url) {
        console.log('[Background] Active tab:', { id: tab.id, url: tab.url, title: tab.title })
        // Manually trigger tracking if it's a valid URL
        if (tab.url.startsWith('http')) {
          console.log('[Background] Starting manual tracking for active tab')
          pageTracker.startTracking(tab.id, tab.url, tab.title || 'Untitled')
        }
      }
    }
  } catch (error) {
    console.error('[Background] Error checking active tabs:', error)
  }
}

// Handle messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message.type, message)

  if (message.type === 'get-status') {
    chrome.storage.local.get(['serverUrl', 'authToken', 'enabled'], config => {
      const status = {
        config,
        activeVisits: pageTracker.getActiveVisitsCount(),
      }
      console.log('[Background] Sending status:', status)
      sendResponse(status)
    })
    return true // Will respond asynchronously
  }

  if (message.type === 'update-config') {
    console.log('[Background] Updating config:', message.config)
    chrome.storage.local.set(message.config, () => {
      console.log('[Background] Config updated')
      sendResponse({ success: true })
    })
    return true
  }

  if (message.type === 'ogp-data') {
    console.log('[Background] Received OGP data from content script:', message.data)
    // This is handled by PageTracker
  }

  if (message.type === 'auto-process-content') {
    console.log('[Background] Received auto-process request for URL:', message.data?.url)
    console.log('[Background] Content length:', message.data?.content?.length)

    // データを直接サーバーに送信して自動処理を依頼
    chrome.storage.local.get(['serverUrl', 'authToken', 'enabled'], async config => {
      console.log('[Background] Current config:', {
        enabled: config.enabled,
        hasAuthToken: !!config.authToken,
        serverUrl: config.serverUrl,
      })

      if (!config.enabled) {
        console.log('[Background] Extension disabled, skipping auto-processing')
        return
      }

      if (!config.authToken) {
        console.log('[Background] No auth token configured, skipping auto-processing')
        return
      }

      try {
        console.log('[Background] Sending auto-processing request to server')
        const response = await fetch(`${config.serverUrl}/api/auto-content-processing`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.authToken}`,
          },
          body: JSON.stringify(message.data),
        })

        const result = await response.json()
        console.log('[Background] Server response:', result)

        if (response.ok && result.success) {
          console.log(
            '[Background] Auto-processing successful:',
            result.processed,
            'patterns processed'
          )
          // Optional: Show notification or update badge
        } else {
          console.log('[Background] Auto-processing failed or no patterns matched:', result)
        }
      } catch (error) {
        console.error('[Background] Error in auto-processing:', error)
      }
    })
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
