// Content extractor types
interface ExtractedContent {
  title: string
  mainContent: string
  metadata?: {
    author?: string
    publishDate?: string
    description?: string
  }
}

// Simple content extractor class
class ContentExtractor {
  extractPageContent(): ExtractedContent {
    const title = this.extractTitle()
    const mainContent = this.extractMainContent()
    const metadata = this.extractMetadata()

    return {
      title,
      mainContent,
      metadata,
    }
  }

  private extractTitle(): string {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
    if (ogTitle) return ogTitle

    return document.title || 'Untitled'
  }

  private extractMainContent(): string {
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.main-content',
      '.content',
      '.post-content',
      '.article-content',
      '.entry-content',
      '#main',
      '#content',
    ]

    let content = ''

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        content = this.extractTextFromElement(element)
        if (content.length > 100) {
          break
        }
      }
    }

    if (content.length < 100) {
      content = this.extractTextFromElement(document.body)
    }

    return this.cleanContent(content)
  }

  private extractTextFromElement(element: Element): string {
    const excludeSelectors = [
      'script',
      'style',
      'nav',
      'header',
      'footer',
      '.navigation',
      '.sidebar',
      '.ads',
      '.advertisement',
      '.social-media',
      '.comments',
      '.related-posts',
      '[aria-hidden="true"]',
    ]

    const clone = element.cloneNode(true) as Element

    excludeSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector)
      elements.forEach(el => el.remove())
    })

    return clone.textContent || ''
  }

  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()
      .substring(0, 8000)
  }

  private extractMetadata(): { author?: string; publishDate?: string; description?: string } {
    const metadata: { author?: string; publishDate?: string; description?: string } = {}

    const authorSelectors = [
      'meta[name="author"]',
      'meta[property="article:author"]',
      '.author',
      '.byline',
      '[rel="author"]',
    ]

    for (const selector of authorSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        const author = element.getAttribute('content') || element.textContent?.trim()
        if (author) {
          metadata.author = author
          break
        }
      }
    }

    const dateSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="date"]',
      'time[datetime]',
      '.published',
      '.date',
    ]

    for (const selector of dateSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        const date =
          element.getAttribute('content') ||
          element.getAttribute('datetime') ||
          element.textContent?.trim()
        if (date) {
          metadata.publishDate = date
          break
        }
      }
    }

    const descriptionSelectors = ['meta[name="description"]', 'meta[property="og:description"]']

    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        const description = element.getAttribute('content')
        if (description) {
          metadata.description = description
          break
        }
      }
    }

    return metadata
  }
}

// Logger that sends to both console and remote via background script
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[AutoContentProcessor] ${message}`, data || '')
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
    console.error(`[AutoContentProcessor] ${message}`, data || '')
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

class AutoContentProcessor {
  private extractor: ContentExtractor
  private processed: boolean = false

  constructor() {
    logger.info('Initializing auto-processor for URL:', {
      url: window.location.href,
    })
    this.extractor = new ContentExtractor()
    this.init()
  }

  private async init(): Promise<void> {
    logger.info('Init called', { readyState: document.readyState })

    if (document.readyState === 'loading') {
      logger.info('Document still loading, waiting for DOMContentLoaded')
      document.addEventListener('DOMContentLoaded', () => this.processPage())
    } else {
      logger.info('Document ready, scheduling processPage')
      setTimeout(() => this.processPage(), 1000)
    }
  }

  private async processPage(): Promise<void> {
    if (this.processed) return
    this.processed = true

    try {
      const result = await chrome.storage.local.get(['autoProcessingEnabled'])

      if (!result.autoProcessingEnabled) {
        logger.info('Auto processing is disabled, skipping')
        return
      }

      const currentUrl = window.location.href
      logger.info('Starting processPage for URL:', { url: currentUrl })

      const content = this.extractor.extractPageContent()

      if (content.mainContent.length < 50) {
        logger.info('Content too short, skipping', {
          contentLength: content.mainContent.length,
        })
        return
      }

      logger.info('Extracted content, sending to server for auto-processing', {
        contentLength: content.mainContent.length,
        title: content.title,
      })

      chrome.runtime.sendMessage({
        type: 'auto-process-content',
        data: {
          url: currentUrl,
          title: content.title,
          content: content.mainContent,
          metadata: content.metadata,
        },
      })
    } catch (error) {
      logger.error('Error in processPage:', {
        error: error instanceof Error ? error.message : error,
      })
    }
  }
}

// Create instance
logger.info('Creating AutoContentProcessor instance')
new AutoContentProcessor()
logger.info('AutoContentProcessor instance created')
