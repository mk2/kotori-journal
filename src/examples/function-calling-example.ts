/**
 * Anthropic SDK Function Calling の使用例
 *
 * このファイルは、FunctionCallingServiceの基本的な使用方法を示すサンプルコードです。
 */

import { FunctionCallingService } from '../services/function-calling'
import {
  weatherTool,
  calculatorTool,
  fileInfoTool,
  createTool,
  stringParam,
} from '../utils/function-calling-helpers'

/**
 * 基本的な使用例
 */
export async function basicExample() {
  // FunctionCallingServiceのインスタンスを作成
  const functionCalling = new FunctionCallingService()

  // ツールを登録
  functionCalling.registerTool(weatherTool)
  functionCalling.registerTool(calculatorTool)
  functionCalling.registerTool(fileInfoTool)

  // AIに質問（function callingが実行される）
  try {
    const response = await functionCalling.callWithFunctions(
      '東京の天気を教えてください。また、2 + 3 * 4の計算結果も知りたいです。',
      {
        systemPrompt:
          'あなたは親切なアシスタントです。ツールを使って正確な情報を提供してください。',
        temperature: 0.1,
      }
    )

    console.log('AI Response:', response.content)
    console.log('Function Calls:', response.functionCalls)
    console.log('Function Results:', response.functionResults)
  } catch (error) {
    console.error('Error:', error)
  }
}

/**
 * カスタムツールの作成例
 */
export async function customToolExample() {
  const functionCalling = new FunctionCallingService()

  // カスタムツールを作成
  const textProcessingTool = createTool(
    'process_text',
    'テキストを処理します（大文字変換、文字数カウントなど）',
    {
      text: stringParam('処理したいテキスト', true),
      operation: stringParam('処理の種類（uppercase, lowercase, count, reverse）', true),
    },
    async args => {
      const { text, operation } = args as { text: string; operation: string }

      switch (operation) {
        case 'uppercase':
          return { original: text, result: text.toUpperCase(), operation }
        case 'lowercase':
          return { original: text, result: text.toLowerCase(), operation }
        case 'count':
          return { original: text, result: text.length, operation }
        case 'reverse':
          return { original: text, result: text.split('').reverse().join(''), operation }
        default:
          throw new Error(`不明な操作: ${operation}`)
      }
    },
    ['text', 'operation']
  )

  // カスタムツールを登録
  functionCalling.registerTool(textProcessingTool)

  try {
    const response = await functionCalling.callWithFunctions(
      '"Hello World"を大文字に変換し、文字数も教えてください。',
      {
        systemPrompt: 'テキスト処理ツールを使ってユーザーの要求に応えてください。',
      }
    )

    console.log('AI Response:', response.content)
    console.log('Function Results:', response.functionResults)
  } catch (error) {
    console.error('Error:', error)
  }
}

/**
 * エラーハンドリングの例
 */
export async function errorHandlingExample() {
  const functionCalling = new FunctionCallingService()

  // エラーを発生させるツール
  const errorTool = createTool(
    'error_example',
    'エラーを発生させるサンプルツール',
    {
      shouldError: stringParam('エラーを発生させるかどうか（yes/no）', true),
    },
    async args => {
      const { shouldError } = args as { shouldError: string }
      if (shouldError === 'yes') {
        throw new Error('意図的なエラーです')
      }
      return { message: 'エラーは発生しませんでした' }
    },
    ['shouldError']
  )

  functionCalling.registerTool(errorTool)

  try {
    const response = await functionCalling.callWithFunctions(
      'エラーが発生する処理を実行してください。',
      {
        systemPrompt:
          'ツールを使用してみてください。エラーが発生した場合は適切に報告してください。',
      }
    )

    console.log('AI Response:', response.content)
    console.log('Function Results:', response.functionResults)

    // エラーが含まれているかチェック
    const hasErrors = response.functionResults.some(result => result.error)
    if (hasErrors) {
      console.log('Some function calls resulted in errors:')
      response.functionResults
        .filter(result => result.error)
        .forEach(result => console.log(`- ${result.name}: ${result.error}`))
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

/**
 * ツールの動的管理例
 */
export async function dynamicToolManagementExample() {
  const functionCalling = new FunctionCallingService()

  console.log('初期状態のツール:', functionCalling.getRegisteredTools())

  // ツールを段階的に追加
  functionCalling.registerTool(weatherTool)
  console.log('天気ツール追加後:', functionCalling.getRegisteredTools())

  functionCalling.registerTool(calculatorTool)
  console.log('計算ツール追加後:', functionCalling.getRegisteredTools())

  // 特定のツールを削除
  functionCalling.unregisterTool('get_weather')
  console.log('天気ツール削除後:', functionCalling.getRegisteredTools())

  // 全ツールをクリア
  functionCalling.clearTools()
  console.log('全ツールクリア後:', functionCalling.getRegisteredTools())
}

// メイン実行関数（実際の使用時は適宜呼び出してください）
export async function runAllExamples() {
  console.log('=== 基本的な使用例 ===')
  await basicExample()

  console.log('\n=== カスタムツールの作成例 ===')
  await customToolExample()

  console.log('\n=== エラーハンドリングの例 ===')
  await errorHandlingExample()

  console.log('\n=== ツールの動的管理例 ===')
  await dynamicToolManagementExample()
}

// 環境変数のチェック
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY環境変数が設定されていません。')
  console.warn('実際にAPIを呼び出すには、Anthropic APIキーが必要です。')
}
