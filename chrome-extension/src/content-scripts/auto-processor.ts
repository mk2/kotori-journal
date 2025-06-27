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
const autoProcessorLogger = {
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

class AutoContentProcessor {
  private extractor: ContentExtractor
  private processed: boolean = false
  private currentUrl: string

  constructor() {
    this.currentUrl = window.location.href
    autoProcessorLogger.info('Initializing auto-processor for URL:', {
      url: this.currentUrl,
    })
    this.extractor = new ContentExtractor()
    this.init()
    this.setupUrlChangeObserver()
  }

  private async init(): Promise<void> {
    autoProcessorLogger.info('Init called', { readyState: document.readyState })

    if (document.readyState === 'loading') {
      autoProcessorLogger.info('Document still loading, waiting for DOMContentLoaded')
      document.addEventListener('DOMContentLoaded', () => this.processPage())
    } else {
      autoProcessorLogger.info('Document ready, scheduling processPage')
      setTimeout(() => this.processPage(), 1000)
    }
  }

  private setupUrlChangeObserver(): void {
    // URL変更を監視してprocessedフラグをリセット
    const observer = new MutationObserver(() => {
      if (window.location.href !== this.currentUrl) {
        autoProcessorLogger.info('URL changed in auto-processor', {
          from: this.currentUrl,
          to: window.location.href,
        })
        this.currentUrl = window.location.href
        this.processed = false // 重要: processedフラグをリセット

        // 新しいページでの処理を少し遅らせて実行
        setTimeout(() => this.processPage(), 2000)
      }
    })

    observer.observe(document, {
      childList: true,
      subtree: true,
    })
  }

  private async processPage(): Promise<void> {
    if (this.processed) return
    this.processed = true

    try {
      const result = await chrome.storage.local.get(['autoProcessingEnabled'])

      if (!result.autoProcessingEnabled) {
        autoProcessorLogger.info('Auto processing is disabled, skipping')
        return
      }

      const currentUrl = window.location.href
      autoProcessorLogger.info('Starting processPage for URL:', { url: currentUrl })

      const content = this.extractor.extractPageContent()

      if (content.mainContent.length < 50) {
        autoProcessorLogger.info('Content too short, skipping', {
          contentLength: content.mainContent.length,
        })
        return
      }

      autoProcessorLogger.info('Extracted content, sending to server for auto-processing', {
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
      autoProcessorLogger.error('Error in processPage:', {
        error: error instanceof Error ? error.message : error,
      })
    }
  }
}

// Create instance
autoProcessorLogger.info('Creating AutoContentProcessor instance')
new AutoContentProcessor()
autoProcessorLogger.info('AutoContentProcessor instance created')
