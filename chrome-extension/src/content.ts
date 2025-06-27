// OGP Data interface
interface OGPData {
  title?: string
  description?: string
  image?: string
}

// Inline OGP extractor
class OGPExtractor {
  extract(): OGPData {
    const ogpData: OGPData = {}

    // Extract og:title
    const titleElement = document.querySelector('meta[property="og:title"]')
    if (titleElement) {
      const title = titleElement.getAttribute('content')
      if (title && title.trim()) {
        ogpData.title = title.trim()
      }
    }

    // Extract og:description
    const descElement = document.querySelector('meta[property="og:description"]')
    if (descElement) {
      const description = descElement.getAttribute('content')
      if (description && description.trim()) {
        ogpData.description = description.trim()
      }
    }

    // Extract og:image
    const imageElement = document.querySelector('meta[property="og:image"]')
    if (imageElement) {
      const image = imageElement.getAttribute('content')
      if (image && image.trim()) {
        ogpData.image = this.normalizeImageUrl(image.trim())
      }
    }

    return ogpData
  }

  extractWithFallback(): OGPData {
    const ogpData = this.extract()

    // Use page title as fallback
    if (!ogpData.title && document.title) {
      ogpData.title = document.title.trim()
    }

    // Use meta description as fallback
    if (!ogpData.description) {
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc) {
        const description = metaDesc.getAttribute('content')
        if (description && description.trim()) {
          ogpData.description = description.trim()
        }
      }
    }

    return ogpData
  }

  extractAndSend(): void {
    const ogpData = this.extractWithFallback()
    contentLogger.info('Extracted OGP data:', ogpData)

    // Only send if we have some data
    if (Object.keys(ogpData).length > 0) {
      contentLogger.info('Sending OGP data to background')
      chrome.runtime.sendMessage({
        type: 'ogp-data',
        data: ogpData,
      })
    } else {
      contentLogger.info('No OGP data to send')
    }
  }

  private normalizeImageUrl(url: string): string {
    // Convert relative URLs to absolute
    if (url.startsWith('/')) {
      return `${window.location.origin}${url}`
    }
    if (url.startsWith('./')) {
      return `${window.location.origin}${window.location.pathname}${url.substring(2)}`
    }
    return url
  }
}

// Logger that sends to both console and remote via background script
const contentLogger = {
  info: (message: string, data?: any) => {
    // コンソール出力は無効化
    // Send to background script for remote logging
    chrome.runtime
      .sendMessage({
        type: 'remote-log',
        level: 'info',
        logMessage: message,
        data: data,
      })
      .catch(() => {
        // Ignore errors if background script is not ready
      })
  },
  error: (message: string, data?: any) => {
    // コンソール出力は無効化
    // Send to background script for remote logging
    chrome.runtime
      .sendMessage({
        type: 'remote-log',
        level: 'error',
        logMessage: message,
        data: data,
      })
      .catch(() => {
        // Ignore errors if background script is not ready
      })
  },
}

// Initialize OGP extractor
contentLogger.info('Content script loaded for:', { url: window.location.href })
const ogpExtractor = new OGPExtractor()

// Extract OGP data when page is loaded
function extractOGPData(): void {
  contentLogger.info('Extracting OGP data for:', { url: window.location.href })
  // Wait a bit for the page to fully load
  setTimeout(() => {
    ogpExtractor.extractAndSend()
  }, 1000)
}

// Extract on initial load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', extractOGPData)
} else {
  extractOGPData()
}

// Also extract when page changes (for SPAs)
let currentUrl = window.location.href
const observer = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    contentLogger.info('URL changed', { from: currentUrl, to: window.location.href })
    currentUrl = window.location.href
    extractOGPData()
  }
})

observer.observe(document, {
  childList: true,
  subtree: true,
})

// Listen for manual requests from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'extract-ogp') {
    const ogpData = ogpExtractor.extractWithFallback()
    sendResponse(ogpData)
  }
})
