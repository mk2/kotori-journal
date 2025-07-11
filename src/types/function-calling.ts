export interface FunctionParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  properties?: Record<string, FunctionParameter>
  items?: FunctionParameter
  required?: boolean
}

export interface FunctionDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, FunctionParameter>
    required?: string[]
  }
}

export interface FunctionCall {
  name: string
  arguments: Record<string, unknown>
}

export interface FunctionCallResult {
  name: string
  result: unknown
  error?: string
}

export interface FunctionTool {
  definition: FunctionDefinition
  handler: (args: Record<string, unknown>) => Promise<unknown>
}

export interface FunctionCallingOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

export interface FunctionCallingResponse {
  content: string
  functionCalls: FunctionCall[]
  functionResults: FunctionCallResult[]
}
