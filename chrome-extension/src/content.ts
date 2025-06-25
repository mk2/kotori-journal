import { OGPExtractor } from './services/ogp-extractor'

// Initialize OGP extractor
console.log('[Content] Content script loaded for:', window.location.href)
const ogpExtractor = new OGPExtractor()

// Extract OGP data when page is loaded
function extractOGPData(): void {
  console.log('[Content] Extracting OGP data for:', window.location.href)
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
    console.log('[Content] URL changed from', currentUrl, 'to', window.location.href)
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
