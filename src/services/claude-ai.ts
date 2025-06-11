import Anthropic from '@anthropic-ai/sdk'
import { JournalEntry } from '../models/journal'

export class ClaudeAIService {
  private anthropic: Anthropic

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required')
    }

    this.anthropic = new Anthropic({
      apiKey: apiKey
    })
  }

  /**
   * AIトリガーかどうかを判定
   */
  isAITrigger(text: string): boolean {
    const triggers = [
      // 質問トリガー
      '？', '?',
      // 要約トリガー
      '要約して', 'まとめて',
      // アドバイストリガー
      'アドバイスして', '助言をください'
    ]

    return triggers.some(trigger => text.includes(trigger))
  }

  /**
   * AIリクエストを処理
   */
  async processAIRequest(text: string, entries: JournalEntry[]): Promise<string> {
    if (!this.isAITrigger(text)) {
      throw new Error('Not an AI trigger')
    }

    try {
      const prompt = this.buildPrompt(text, entries)
      
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })

      const content = response.content[0]
      if (content.type === 'text') {
        return content.text
      }
      
      throw new Error('Unexpected response format')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Claude API request failed: ${message}`)
    }
  }

  /**
   * プロンプトを構築
   */
  private buildPrompt(text: string, entries: JournalEntry[]): string {
    const formattedEntries = this.formatEntriesForAI(entries)
    
    if (text.includes('？') || text.includes('?')) {
      // 質問モード
      if (entries.length === 0) {
        return `今日はまだジャーナルエントリーがありません。質問: "${text}"`
      }
      return `以下は今日のジャーナルエントリーです：

${formattedEntries}

質問: "${text}"

上記のエントリーを参考に、簡潔に回答してください。`
    }
    
    if (text.includes('要約') || text.includes('まとめ')) {
      // 要約モード
      if (entries.length === 0) {
        return '今日はまだジャーナルエントリーがありません。要約するものがありません。'
      }
      return `以下のジャーナルエントリーを要約してください：

${formattedEntries}

重要なポイントを3-5行で簡潔にまとめてください。`
    }
    
    if (text.includes('アドバイス') || text.includes('助言')) {
      // アドバイスモード
      if (entries.length === 0) {
        return '今日はまだジャーナルエントリーがありません。アドバイスを提供するためのコンテキストがありません。'
      }
      return `以下のジャーナルエントリーに基づいてアドバイスをください：

${formattedEntries}

内容を分析して、建設的なアドバイスや気づきを3-5行で提供してください。`
    }

    return `${text}

ジャーナルエントリー：
${formattedEntries}`
  }

  /**
   * ジャーナルエントリーをAI用にフォーマット
   */
  private formatEntriesForAI(entries: JournalEntry[]): string {
    if (entries.length === 0) {
      return '(エントリーなし)'
    }

    return entries
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map(entry => {
        const time = entry.timestamp.toLocaleTimeString('ja-JP', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
        return `${time} [${entry.category}] ${entry.content}`
      })
      .join('\n')
  }
}