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

// Platform types
type Platform = 'redmine' | 'github' | 'generic'

// Simple content extractor class
class ContentExtractor {
  private platform: Platform

  constructor() {
    this.platform = this.detectPlatform()
  }

  private detectPlatform(): Platform {
    const url = window.location.href
    const hostname = window.location.hostname

    // GitHub detection
    if (hostname === 'github.com' || hostname.endsWith('.github.com')) {
      return 'github'
    }

    // Redmine detection - check for common Redmine indicators
    if (
      url.includes('/issues/') ||
      document.querySelector('body.controller-issues') ||
      document.querySelector('.issue.details') ||
      document.querySelector('#issue_tree')
    ) {
      return 'redmine'
    }

    return 'generic'
  }

  extractPageContent(): ExtractedContent {
    // Use platform-specific extraction if available
    switch (this.platform) {
      case 'redmine':
        return this.extractRedmineContent()
      case 'github':
        return this.extractGitHubContent()
      default: {
        // Fall back to generic extraction
        const title = this.extractTitle()
        const mainContent = this.extractMainContent()
        const metadata = this.extractMetadata()

        return {
          title,
          mainContent,
          metadata,
        }
      }
    }
  }

  private extractTitle(): string {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
    if (ogTitle) return ogTitle

    return document.title || 'Untitled'
  }

  private extractRedmineContent(): ExtractedContent {
    const title = this.extractRedmineTitle()
    const mainContent = this.extractRedmineMainContent()
    const metadata = this.extractRedmineMetadata()

    return {
      title,
      mainContent,
      metadata,
    }
  }

  private extractRedmineTitle(): string {
    // Redmine issue title selectors
    const titleElement =
      document.querySelector('.issue h3') ||
      document.querySelector('h2.issue') ||
      document.querySelector('.subject h3') ||
      document.querySelector('#issue_subject')

    if (titleElement) {
      return titleElement.textContent?.trim() || ''
    }

    return this.extractTitle()
  }

  private extractRedmineMainContent(): string {
    const sections: string[] = []

    // Issue description
    const descriptionElement =
      document.querySelector('.issue .description .wiki') ||
      document.querySelector('.issue .description') ||
      document.querySelector('div.description')

    if (descriptionElement) {
      sections.push('【説明】\n' + this.extractTextFromElement(descriptionElement))
    }

    // Issue details (status, priority, assignee, etc.)
    const detailsElement =
      document.querySelector('.issue .attributes') || document.querySelector('.issue-details')

    if (detailsElement) {
      const details = this.extractTextFromElement(detailsElement)
      if (details) {
        sections.push('【詳細】\n' + details)
      }
    }

    // History/Comments
    const journalElements =
      document.querySelectorAll('#history .journal') || document.querySelectorAll('.journal')

    if (journalElements.length > 0) {
      const comments: string[] = []
      journalElements.forEach(journal => {
        const author = journal.querySelector('.author')?.textContent?.trim() || '不明'
        const time = journal.querySelector('.timestamp')?.textContent?.trim() || ''
        const notes = journal.querySelector('.wiki') || journal.querySelector('.notes')
        if (notes) {
          const comment = this.extractTextFromElement(notes)
          if (comment) {
            comments.push(`${author} (${time}):\n${comment}`)
          }
        }
      })
      if (comments.length > 0) {
        sections.push('【コメント履歴】\n' + comments.join('\n\n'))
      }
    }

    const content = sections.join('\n\n')
    return this.cleanContent(content || this.extractMainContent())
  }

  private extractRedmineMetadata(): {
    author?: string
    publishDate?: string
    description?: string
  } {
    const metadata: { author?: string; publishDate?: string; description?: string } = {}

    // Author
    const authorElement =
      document.querySelector('.issue .author') || document.querySelector('.author')
    if (authorElement) {
      metadata.author = authorElement.textContent?.trim()
    }

    // Created date
    const createdElement =
      document.querySelector('.issue .created-on') || document.querySelector('.created_on')
    if (createdElement) {
      metadata.publishDate = createdElement.textContent?.trim()
    }

    // Status
    const statusElement =
      document.querySelector('.issue .status') || document.querySelector('td.status')
    if (statusElement) {
      const status = statusElement.textContent?.trim()
      if (status) {
        metadata.description = `ステータス: ${status}`
      }
    }

    return metadata
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

  private extractGitHubContent(): ExtractedContent {
    const title = this.extractGitHubTitle()
    const mainContent = this.extractGitHubMainContent()
    const metadata = this.extractGitHubMetadata()

    return {
      title,
      mainContent,
      metadata,
    }
  }

  private extractGitHubTitle(): string {
    // GitHub issue title selectors
    const titleElement =
      document.querySelector('.js-issue-title') ||
      document.querySelector('[data-hovercard-type="issue"] .js-navigation-open') ||
      document.querySelector('.gh-header-title .js-issue-title') ||
      document.querySelector('.discussion-topic-header h1')

    if (titleElement) {
      return titleElement.textContent?.trim() || ''
    }

    return this.extractTitle()
  }

  private extractGitHubMainContent(): string {
    const sections: string[] = []

    // Issue body
    const bodyElement =
      document.querySelector('.comment-body:first-of-type .markdown-body') ||
      document.querySelector('.js-comment-container:first-of-type .markdown-body') ||
      document.querySelector('[data-target="issue-body.body"] .markdown-body')

    if (bodyElement) {
      sections.push('【説明】\n' + this.extractTextFromElement(bodyElement))
    }

    // Labels
    const labelElements = document.querySelectorAll('.js-issue-labels .IssueLabel')
    if (labelElements.length > 0) {
      const labels = Array.from(labelElements)
        .map(label => label.textContent?.trim())
        .filter(Boolean)
      if (labels.length > 0) {
        sections.push('【ラベル】\n' + labels.join(', '))
      }
    }

    // Comments
    const commentElements = document.querySelectorAll('.js-comment-container:not(:first-of-type)')
    if (commentElements.length > 0) {
      const comments: string[] = []
      commentElements.forEach(comment => {
        const author =
          comment.querySelector('.author')?.textContent?.trim() ||
          comment.querySelector('.timeline-comment-header-text strong')?.textContent?.trim() ||
          '不明'
        const time = comment.querySelector('relative-time')?.getAttribute('datetime') || ''
        const body = comment.querySelector('.markdown-body')
        if (body) {
          const commentText = this.extractTextFromElement(body)
          if (commentText) {
            comments.push(`${author} (${time}):\n${commentText}`)
          }
        }
      })
      if (comments.length > 0) {
        sections.push('【コメント履歴】\n' + comments.join('\n\n'))
      }
    }

    const content = sections.join('\n\n')
    return this.cleanContent(content || this.extractMainContent())
  }

  private extractGitHubMetadata(): { author?: string; publishDate?: string; description?: string } {
    const metadata: { author?: string; publishDate?: string; description?: string } = {}

    // Author
    const authorElement =
      document.querySelector('.gh-header-meta .author') ||
      document.querySelector('.timeline-comment-header-text .author')
    if (authorElement) {
      metadata.author = authorElement.textContent?.trim()
    }

    // Created date
    const dateElement = document.querySelector('.gh-header-meta relative-time')
    if (dateElement) {
      metadata.publishDate = dateElement.getAttribute('datetime') || dateElement.textContent?.trim()
    }

    // State (open/closed)
    const stateElement = document.querySelector('.State')
    if (stateElement) {
      const state = stateElement.textContent?.trim()
      if (state) {
        metadata.description = `状態: ${state}`
      }
    }

    return metadata
  }

  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()
      .substring(0, 8000)
  }

  private extractMetadata(): { author?: string; publishDate?: string; description?: string } {
    // Use platform-specific metadata extraction if available
    switch (this.platform) {
      case 'redmine':
        return this.extractRedmineMetadata()
      case 'github':
        return this.extractGitHubMetadata()
      default: {
        // Generic metadata extraction
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
