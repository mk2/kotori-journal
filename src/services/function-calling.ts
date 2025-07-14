import Anthropic from '@anthropic-ai/sdk'
import {
  FunctionTool,
  FunctionCall,
  FunctionCallResult,
  FunctionCallingOptions,
  FunctionCallingResponse,
} from '../types/function-calling'

export class FunctionCallingService {
  private tools: Map<string, FunctionTool> = new Map()
  private anthropic: Anthropic

  constructor(anthropicClient?: Anthropic) {
    if (anthropicClient) {
      this.anthropic = anthropicClient
    } else {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required')
      }
      this.anthropic = new Anthropic({ apiKey })
    }
  }

  /**
   * ツールを登録する
   */
  registerTool(tool: FunctionTool): void {
    if (this.tools.has(tool.definition.name)) {
      throw new Error(`Tool ${tool.definition.name} already exists`)
    }
    this.tools.set(tool.definition.name, tool)
  }

  /**
   * ツールの登録を解除する
   */
  unregisterTool(name: string): void {
    this.tools.delete(name)
  }

  /**
   * 全てのツールをクリアする
   */
  clearTools(): void {
    this.tools.clear()
  }

  /**
   * 登録されているツール名の一覧を取得する
   */
  getRegisteredTools(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * function callingを使ってClaude APIを呼び出す
   */
  async callWithFunctions(
    userMessage: string,
    options?: FunctionCallingOptions
  ): Promise<FunctionCallingResponse> {
    const tools = this.buildToolDefinitions()
    const messages = [
      {
        role: 'user' as const,
        content: userMessage,
      },
    ]

    const requestParams: any = {
      model: options?.model || 'claude-sonnet-4-20250514',
      max_tokens: options?.maxTokens || 1000,
      messages,
    }

    // システムプロンプトがある場合は追加
    if (options?.systemPrompt) {
      requestParams.system = options.systemPrompt
    }

    // 温度設定がある場合は追加
    if (options?.temperature !== undefined) {
      requestParams.temperature = options.temperature
    }

    // ツールがある場合は追加
    if (tools.length > 0) {
      requestParams.tools = tools
    }

    const response = await this.anthropic.messages.create(requestParams)

    // レスポンスを処理
    const functionCalls: FunctionCall[] = []
    const functionResults: FunctionCallResult[] = []
    let content = ''

    for (const contentBlock of response.content) {
      if (contentBlock.type === 'text') {
        content += contentBlock.text
      } else if (contentBlock.type === 'tool_use') {
        const args = contentBlock.input as Record<string, unknown>
        const functionCall: FunctionCall = {
          name: contentBlock.name,
          arguments: args,
        }
        functionCalls.push(functionCall)

        // 関数を実行
        const result = await this.executeFunctionCall(contentBlock.name, args)
        functionResults.push(result)
      }
    }

    return {
      content,
      functionCalls,
      functionResults,
    }
  }

  /**
   * ツール定義をAnthropic API用の形式に変換する
   */
  private buildToolDefinitions(): Array<{
    name: string
    description: string
    input_schema: {
      type: 'object'
      properties: Record<string, any>
      required?: string[]
    }
  }> {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.definition.name,
      description: tool.definition.description,
      input_schema: {
        type: 'object',
        properties: tool.definition.parameters.properties,
        required: tool.definition.parameters.required,
      },
    }))
  }

  /**
   * 関数呼び出しを実行する
   */
  private async executeFunctionCall(
    name: string,
    args: Record<string, unknown>
  ): Promise<FunctionCallResult> {
    const tool = this.tools.get(name)

    if (!tool) {
      return {
        name,
        result: null,
        error: `Unknown function: ${name}`,
      }
    }

    try {
      const result = await tool.handler(args)
      return {
        name,
        result,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        name,
        result: null,
        error: errorMessage,
      }
    }
  }
}
