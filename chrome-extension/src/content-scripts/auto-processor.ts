import { ContentExtractor } from '../services/content-extractor'

class AutoContentProcessor {
  private extractor: ContentExtractor
  private processed: boolean = false

  constructor() {
    console.log('[AutoContentProcessor] Initializing auto-processor for URL:', window.location.href)
    this.extractor = new ContentExtractor()
    this.init()
  }

  private async init(): Promise<void> {
    console.log('[AutoContentProcessor] Init called, document.readyState:', document.readyState)
    // ページが完全に読み込まれてから処理を開始
    if (document.readyState === 'loading') {
      console.log('[AutoContentProcessor] Document still loading, waiting for DOMContentLoaded')
      document.addEventListener('DOMContentLoaded', () => this.processPage())
    } else {
      // すでに読み込み完了している場合
      console.log('[AutoContentProcessor] Document ready, scheduling processPage')
      setTimeout(() => this.processPage(), 1000) // 少し待ってから実行
    }
  }

  private async processPage(): Promise<void> {
    if (this.processed) return
    this.processed = true

    try {
      // 自動コンテンツ処理が有効かどうかをチェック
      const result = await chrome.storage.local.get(['autoProcessingEnabled'])

      if (!result.autoProcessingEnabled) {
        console.log('[AutoContentProcessor] Auto processing is disabled, skipping')
        return
      }

      const currentUrl = window.location.href
      console.log('[AutoContentProcessor] Starting processPage for URL:', currentUrl)

      // コンテンツを抽出
      const content = this.extractor.extractPageContent()

      if (content.mainContent.length < 50) {
        console.log('[AutoContentProcessor] Content too short, skipping')
        return
      }

      console.log('[AutoContentProcessor] Extracted content, sending to server for auto-processing')

      // サーバーにコンテンツを送信して自動処理を依頼
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
      console.error('[AutoContentProcessor] Error in processPage:', error)
    }
  }
}

// ページごとに1つのインスタンスを作成
console.log('[AutoContentProcessor] Creating AutoContentProcessor instance')
new AutoContentProcessor()
console.log('[AutoContentProcessor] AutoContentProcessor instance created')
