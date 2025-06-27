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
    let processingEntryId: string | undefined

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

      // 処理開始時のジャーナルエントリを作成
      const startContent = `自動コンテンツ処理を開始: ${request.title}\n\nURL: ${request.url}\nパターン: ${pattern.name}\n処理中...`
      const processingEntry = await this.journalService.addEntry(
        startContent,
        '自動処理',
        'entry',
        {
          url: request.url,
          title: request.title,
          patternId: request.patternId,
          patternName: pattern.name,
          status: 'processing',
          startedAt: new Date().toISOString(),
        }
      )
      processingEntryId = processingEntry.id

      // プロンプトを構築
      const fullPrompt = this.buildPrompt(pattern.prompt, request)

      // Claude AIで処理（自動処理なのでトリガーチェックをスキップ）
      const processedContent = await this.claudeAI.processAIRequest(fullPrompt, [], true)

      // 処理完了時のジャーナルエントリを作成
      const completedContent = `自動コンテンツ処理完了: ${request.title}\n\n${processedContent}`
      const completedEntry = await this.journalService.addEntry(
        completedContent,
        'AI処理コンテンツ',
        'entry',
        {
          url: request.url,
          title: request.title,
          patternId: request.patternId,
          patternName: pattern.name,
          status: 'completed',
          startedAt: processingEntry.metadata?.startedAt,
          completedAt: new Date().toISOString(),
          processingEntryId: processingEntryId,
          processedBy: 'claude-ai',
        }
      )

      await this.logger?.info('Content processed successfully', {
        url: request.url,
        processingEntryId: processingEntryId,
        completedEntryId: completedEntry.id,
        patternName: pattern.name,
      })

      return {
        success: true,
        entryId: completedEntry.id,
        processedContent,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // エラー時は処理開始エントリがあれば更新
      if (processingEntryId) {
        try {
          const errorContent = `自動コンテンツ処理エラー: ${request.title}\n\nエラー: ${errorMessage}`
          await this.journalService.addEntry(errorContent, '自動処理エラー', 'entry', {
            url: request.url,
            title: request.title,
            patternId: request.patternId,
            patternName: this.patternManager.getPatternById(request.patternId)?.name,
            status: 'error',
            error: errorMessage,
            processingEntryId: processingEntryId,
            errorAt: new Date().toISOString(),
          })
        } catch (journalError) {
          await this.logger?.error('Failed to create error journal entry', { journalError })
        }
      }

      await this.logger?.error('Content processing failed', {
        error: errorMessage,
        url: request.url,
        patternId: request.patternId,
        processingEntryId,
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
