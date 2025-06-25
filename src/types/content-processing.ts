export interface ContentPattern {
  id: string
  name: string // 設定名（ユーザーが識別しやすい名前）
  urlPattern: string // URLパターン（正規表現）
  prompt: string // LLMへのプロンプト
  enabled: boolean // 有効/無効
  createdAt: Date
  updatedAt: Date
}

export interface ContentProcessingRequest {
  url: string
  title: string
  content: string // 抽出されたページコンテンツ
  patternId: string
}

export interface ContentProcessingResponse {
  success: boolean
  entryId?: string // 作成されたジャーナルエントリのID
  processedContent?: string // LLMで処理された内容
  error?: string
}

export interface ExtractedContent {
  title: string
  mainContent: string
  metadata?: {
    author?: string
    publishDate?: string
    description?: string
  }
}
