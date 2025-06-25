import type { OGPData } from '../types'

export class OGPExtractor {
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
    console.log('[OGPExtractor] Extracted OGP data:', ogpData)

    // Only send if we have some data
    if (Object.keys(ogpData).length > 0) {
      console.log('[OGPExtractor] Sending OGP data to background')
      chrome.runtime.sendMessage({
        type: 'ogp-data',
        data: ogpData,
      })
    } else {
      console.log('[OGPExtractor] No OGP data to send')
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
