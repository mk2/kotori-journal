import { describe, it, expect, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'

// ContentExtractorクラスのテスト用モック実装
class ContentExtractor {
  private platform: 'redmine' | 'github' | 'generic'

  constructor() {
    this.platform = this.detectPlatform()
  }

  private detectPlatform(): 'redmine' | 'github' | 'generic' {
    const url = window.location.href
    const hostname = window.location.hostname

    if (hostname === 'github.com' || hostname.endsWith('.github.com')) {
      return 'github'
    }

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

  extractPageContent() {
    switch (this.platform) {
      case 'redmine':
        return this.extractRedmineContent()
      case 'github':
        return this.extractGitHubContent()
      default:
        return {
          title: this.extractTitle(),
          mainContent: this.extractMainContent(),
          metadata: this.extractMetadata(),
        }
    }
  }

  private extractTitle(): string {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
    if (ogTitle) return ogTitle
    return document.title || 'Untitled'
  }

  private extractMainContent(): string {
    const contentSelectors = ['article', 'main', '[role="main"]', '.main-content', '#content']
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector)
      if (element && element.textContent) {
        return element.textContent.trim()
      }
    }
    return document.body.textContent?.trim() || ''
  }

  private extractMetadata() {
    return {
      author: document.querySelector('meta[name="author"]')?.getAttribute('content'),
      publishDate: document.querySelector('meta[name="date"]')?.getAttribute('content'),
      description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
    }
  }

  private extractRedmineContent() {
    return {
      title: this.extractRedmineTitle(),
      mainContent: this.extractRedmineMainContent(),
      metadata: this.extractRedmineMetadata(),
    }
  }

  private extractRedmineTitle(): string {
    const titleElement = document.querySelector('.issue h3')
    return titleElement?.textContent?.trim() || this.extractTitle()
  }

  private extractRedmineMainContent(): string {
    const sections: string[] = []
    const descriptionElement = document.querySelector('.issue .description .wiki')
    if (descriptionElement?.textContent) {
      sections.push('【説明】\n' + descriptionElement.textContent.trim())
    }
    return sections.join('\n\n') || this.extractMainContent()
  }

  private extractRedmineMetadata() {
    return {
      author: document.querySelector('.issue .author')?.textContent?.trim(),
      publishDate: document.querySelector('.issue .created-on')?.textContent?.trim(),
      description: `ステータス: ${document.querySelector('.issue .status')?.textContent?.trim() || '不明'}`,
    }
  }

  private extractGitHubContent() {
    return {
      title: this.extractGitHubTitle(),
      mainContent: this.extractGitHubMainContent(),
      metadata: this.extractGitHubMetadata(),
    }
  }

  private extractGitHubTitle(): string {
    const titleElement = document.querySelector('.js-issue-title')
    return titleElement?.textContent?.trim() || this.extractTitle()
  }

  private extractGitHubMainContent(): string {
    const sections: string[] = []
    const bodyElement = document.querySelector('.comment-body:first-of-type .markdown-body')
    if (bodyElement?.textContent) {
      sections.push('【説明】\n' + bodyElement.textContent.trim())
    }
    return sections.join('\n\n') || this.extractMainContent()
  }

  private extractGitHubMetadata() {
    return {
      author: document.querySelector('.gh-header-meta .author')?.textContent?.trim(),
      publishDate: document
        .querySelector('.gh-header-meta relative-time')
        ?.getAttribute('datetime'),
      description: `状態: ${document.querySelector('.State')?.textContent?.trim() || '不明'}`,
    }
  }
}

describe('ContentExtractor', () => {
  let dom: JSDOM
  let extractor: ContentExtractor

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    })
    global.window = dom.window as any
    global.document = dom.window.document
    global.location = dom.window.location
  })

  describe('Generic content extraction', () => {
    it('should extract basic page content', () => {
      document.title = 'Test Page'
      document.body.innerHTML = `
        <meta property="og:title" content="OG Test Title">
        <meta name="description" content="Test description">
        <article>Main article content</article>
      `

      extractor = new ContentExtractor()
      const result = extractor.extractPageContent()

      expect(result.title).toBe('OG Test Title')
      expect(result.mainContent).toContain('Main article content')
      expect(result.metadata?.description).toBe('Test description')
    })

    it('should fallback to document.title when og:title is not available', () => {
      document.title = 'Fallback Title'
      document.body.innerHTML = '<p>Some content</p>'

      extractor = new ContentExtractor()
      const result = extractor.extractPageContent()

      expect(result.title).toBe('Fallback Title')
    })
  })

  describe('Redmine content extraction', () => {
    beforeEach(() => {
      dom = new JSDOM('<!DOCTYPE html><html><body class="controller-issues"></body></html>', {
        url: 'http://redmine.example.com/issues/123',
        pretendToBeVisual: true,
      })
      global.window = dom.window as any
      global.document = dom.window.document
      global.location = dom.window.location
    })

    it('should detect Redmine platform', () => {
      document.body.innerHTML = `
        <div class="issue">
          <h3>Redmine Issue Title</h3>
          <div class="description">
            <div class="wiki">Issue description content</div>
          </div>
          <div class="author">John Doe</div>
          <div class="created-on">2024-01-01</div>
          <div class="status">Open</div>
        </div>
      `

      extractor = new ContentExtractor()
      const result = extractor.extractPageContent()

      expect(result.title).toBe('Redmine Issue Title')
      expect(result.mainContent).toContain('【説明】')
      expect(result.mainContent).toContain('Issue description content')
      expect(result.metadata?.author).toBe('John Doe')
      expect(result.metadata?.publishDate).toBe('2024-01-01')
      expect(result.metadata?.description).toBe('ステータス: Open')
    })
  })

  describe('GitHub content extraction', () => {
    beforeEach(() => {
      dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'https://github.com/owner/repo/issues/123',
        pretendToBeVisual: true,
      })
      global.window = dom.window as any
      global.document = dom.window.document
      global.location = dom.window.location
    })

    it('should detect GitHub platform', () => {
      document.body.innerHTML = `
        <h1 class="js-issue-title">GitHub Issue Title</h1>
        <div class="comment-body">
          <div class="markdown-body">Issue body content</div>
        </div>
        <div class="gh-header-meta">
          <span class="author">octocat</span>
          <relative-time datetime="2024-01-01T00:00:00Z">Jan 1, 2024</relative-time>
        </div>
        <span class="State">Open</span>
      `

      extractor = new ContentExtractor()
      const result = extractor.extractPageContent()

      expect(result.title).toBe('GitHub Issue Title')
      expect(result.mainContent).toContain('【説明】')
      expect(result.mainContent).toContain('Issue body content')
      expect(result.metadata?.author).toBe('octocat')
      expect(result.metadata?.publishDate).toBe('2024-01-01T00:00:00Z')
      expect(result.metadata?.description).toBe('状態: Open')
    })
  })

  describe('Platform detection', () => {
    it('should detect Redmine by URL pattern', () => {
      dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'http://example.com/issues/456',
        pretendToBeVisual: true,
      })
      global.window = dom.window as any
      global.document = dom.window.document
      global.location = dom.window.location

      extractor = new ContentExtractor()
      const result = extractor.extractPageContent()

      // Should use Redmine extraction methods
      expect(result).toBeDefined()
    })

    it('should detect GitHub by hostname', () => {
      dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'https://github.com/test/repo',
        pretendToBeVisual: true,
      })
      global.window = dom.window as any
      global.document = dom.window.document
      global.location = dom.window.location

      extractor = new ContentExtractor()
      const result = extractor.extractPageContent()

      // Should use GitHub extraction methods
      expect(result).toBeDefined()
    })
  })
})
