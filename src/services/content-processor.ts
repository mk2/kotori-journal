import { ClaudeAIService } from './claude-ai.js'
import { JournalService } from './journal-service.js'
import { ContentPatternManager } from '../models/content-pattern.js'
import { ContentProcessingRequest, ContentProcessingResponse } from '../types/content-processing.js'
import { FileLogger } from '../utils/file-logger.js'

export class ContentProcessor {
  private claudeAI: ClaudeAIService
  private journalService: JournalService
  private patternManager: ContentPatternManager
  private logger?: FileLogger

  constructor(
    journalService: JournalService,
    patternManager: ContentPatternManager,
    logger?: FileLogger
  ) {
    this.journalService = journalService
    this.patternManager = patternManager
    this.logger = logger

    // Claude AIサービスの初期化
    try {
      this.claudeAI = new ClaudeAIService()
    } catch (error) {
      this.logger?.error('Failed to initialize Claude AI service', { error })
      throw new Error(
        'Claude AI service is not available. Please set ANTHROPIC_API_KEY environment variable.'
      )
    }
  }

  async processContent(request: ContentProcessingRequest): Promise<ContentProcessingResponse> {
    try {
      await this.logger?.info('Processing content request', {
        url: request.url,
        patternId: request.patternId,
        contentLength: request.content.length,
      })

      // パターンを取得
      const pattern = this.patternManager.getPatternById(request.patternId)
      if (!pattern) {
        const error = 'Pattern not found'
        await this.logger?.error('Content processing failed', {
          error,
          patternId: request.patternId,
        })
        return { success: false, error }
      }

      if (!pattern.enabled) {
        const error = 'Pattern is disabled'
        await this.logger?.error('Content processing failed', {
          error,
          patternId: request.patternId,
        })
        return { success: false, error }
      }

      // プロンプトを構築
      const fullPrompt = this.buildPrompt(pattern.prompt, request)

      // Claude AIで処理（自動処理なのでトリガーチェックをスキップ）
      const processedContent = await this.claudeAI.processAIRequest(fullPrompt, [], true)

      // ジャーナルエントリを作成
      const entryContent = `Auto-processed content from ${request.title} (${request.url})\n\n${processedContent}`
      const journalEntry = await this.journalService.addEntry(
        entryContent,
        'AI処理コンテンツ',
        'entry',
        {
          url: request.url,
          originalTitle: request.title,
          patternId: request.patternId,
          patternName: pattern.name,
          processedBy: 'claude-ai',
          processedAt: new Date().toISOString(),
        }
      )

      await this.logger?.info('Content processed successfully', {
        url: request.url,
        entryId: journalEntry.id,
        patternName: pattern.name,
      })

      return {
        success: true,
        entryId: journalEntry.id,
        processedContent,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.logger?.error('Content processing failed', {
        error: errorMessage,
        url: request.url,
        patternId: request.patternId,
      })

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  private buildPrompt(template: string, request: ContentProcessingRequest): string {
    // プロンプトテンプレートで変数置換
    let prompt = template
    prompt = prompt.replace(/\{url\}/g, request.url)
    prompt = prompt.replace(/\{title\}/g, request.title)
    prompt = prompt.replace(/\{content\}/g, request.content)

    return prompt
  }

  // 利用可能かどうかをチェック
  isAvailable(): boolean {
    return this.claudeAI !== undefined
  }
}
