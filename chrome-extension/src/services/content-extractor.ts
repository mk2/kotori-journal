import type { ExtractedContent } from '../types/content-processing'

export class ContentExtractor {
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
    // タイトルを取得（OGPタイトル > ページタイトル）
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
    if (ogTitle) return ogTitle

    return document.title || 'Untitled'
  }

  private extractMainContent(): string {
    // 主要コンテンツを抽出
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

    // セレクターの優先順位でコンテンツを探す
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        content = this.extractTextFromElement(element)
        if (content.length > 100) {
          // 十分なコンテンツがある場合
          break
        }
      }
    }

    // 適切なコンテンツが見つからない場合はbody全体から抽出
    if (content.length < 100) {
      content = this.extractTextFromElement(document.body)
    }

    return this.cleanContent(content)
  }

  private extractTextFromElement(element: Element): string {
    // 不要な要素を除外
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

    // 要素をクローン
    const clone = element.cloneNode(true) as Element

    // 不要な要素を削除
    excludeSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector)
      elements.forEach(el => el.remove())
    })

    // テキストを抽出
    return clone.textContent || ''
  }

  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // 複数の空白を1つに
      .replace(/\n\s*\n/g, '\n') // 複数の改行を1つに
      .trim()
      .substring(0, 8000) // LLMのトークン制限を考慮して制限
  }

  private extractMetadata(): { author?: string; publishDate?: string; description?: string } {
    const metadata: { author?: string; publishDate?: string; description?: string } = {}

    // 著者情報
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

    // 公開日
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

    // 説明
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
