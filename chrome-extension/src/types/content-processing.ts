export interface ContentPattern {
  id: string
  name: string
  urlPattern: string
  prompt: string
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ContentProcessingRequest {
  url: string
  title: string
  content: string
  patternId: string
}

export interface ContentProcessingResponse {
  success: boolean
  entryId?: string
  processedContent?: string
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
