import { PageTracker } from './services/page-tracker'
import { DataSender } from './services/data-sender'

// Initialize services
console.log('[Background] Initializing services...')
const dataSender = new DataSender()
const pageTracker = new PageTracker(dataSender)
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
})
