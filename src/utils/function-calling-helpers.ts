import { FunctionTool, FunctionParameter } from '../types/function-calling'

/**
 * 文字列パラメータのヘルパー関数
 */
export function stringParam(description: string, required = false): FunctionParameter {
  return {
    type: 'string',
    description,
    required,
  }
}

/**
 * 数値パラメータのヘルパー関数
 */
export function numberParam(description: string, required = false): FunctionParameter {
  return {
    type: 'number',
    description,
    required,
  }
}

/**
 * 真偽値パラメータのヘルパー関数
 */
export function booleanParam(description: string, required = false): FunctionParameter {
  return {
    type: 'boolean',
    description,
    required,
  }
}

/**
 * オブジェクトパラメータのヘルパー関数
 */
export function objectParam(
  description: string,
  properties: Record<string, FunctionParameter>,
  required = false
): FunctionParameter {
  return {
    type: 'object',
    description,
    properties,
    required,
  }
}

/**
 * 配列パラメータのヘルパー関数
 */
export function arrayParam(
  description: string,
  items: FunctionParameter,
  required = false
): FunctionParameter {
  return {
    type: 'array',
    description,
    items,
    required,
  }
}

/**
 * ツール作成のヘルパー関数
 */
export function createTool(
  name: string,
  description: string,
  parameters: Record<string, FunctionParameter>,
  handler: (args: Record<string, unknown>) => Promise<unknown>,
  requiredParams?: string[]
): FunctionTool {
  return {
    definition: {
      name,
      description,
      parameters: {
        type: 'object',
        properties: parameters,
        required: requiredParams,
      },
    },
    handler,
  }
}

// 使用例のツール定義

/**
 * 天気情報取得ツールの例
 */
export const weatherTool = createTool(
  'get_weather',
  '指定された場所の天気情報を取得します',
  {
    location: stringParam('場所（都市名）', true),
    unit: stringParam('温度の単位（celsius または fahrenheit）', false),
  },
  async args => {
    const { location, unit = 'celsius' } = args as { location: string; unit?: string }
    // 実際の天気APIを呼び出す代わりに、模擬データを返す
    return {
      location,
      temperature: unit === 'celsius' ? '20°C' : '68°F',
      condition: 'Sunny',
      humidity: '65%',
    }
  },
  ['location']
)

/**
 * 計算ツールの例
 */
export const calculatorTool = createTool(
  'calculate',
  '数学計算を実行します',
  {
    expression: stringParam('計算式（例: "2 + 3 * 4"）', true),
  },
  async args => {
    const { expression } = args as { expression: string }
    try {
      // 簡単な計算式を評価（実際のプロダクションでは安全な評価器を使用すべき）
      const result = Function(`"use strict"; return (${expression})`)()
      return {
        expression,
        result,
      }
    } catch (error) {
      throw new Error(
        `計算に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  },
  ['expression']
)

/**
 * ファイル操作ツールの例
 */
export const fileInfoTool = createTool(
  'get_file_info',
  'ファイルの情報を取得します',
  {
    path: stringParam('ファイルパス', true),
    includeContent: booleanParam('ファイル内容を含めるかどうか', false),
  },
  async args => {
    const { path, includeContent = false } = args as { path: string; includeContent?: boolean }

    // 模擬的なファイル情報を返す
    const mockFileInfo = {
      path,
      size: '1.2 KB',
      lastModified: new Date().toISOString(),
      type: path.endsWith('.ts') ? 'TypeScript' : 'Unknown',
    }

    if (includeContent) {
      return {
        ...mockFileInfo,
        content: '// 模擬的なファイル内容\nconsole.log("Hello, World!")',
      }
    }

    return mockFileInfo
  },
  ['path']
)
