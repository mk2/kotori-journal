# Anthropic SDK Function Calling 基盤

このプロジェクトでは、Anthropic SDKのfunction calling機能を使うための基盤部分を実装しました。

## 作成したファイル

### コア実装
- `src/types/function-calling.ts` - Function calling用の型定義
- `src/services/function-calling.ts` - Function callingの中核サービス
- `src/utils/function-calling-helpers.ts` - ツール作成用のヘルパー関数

### テスト
- `tests/services/function-calling.test.ts` - Function callingサービスのテスト
- `tests/utils/function-calling-helpers.test.ts` - ヘルパー関数のテスト

### サンプル・例
- `src/examples/function-calling-example.ts` - 使用方法のサンプルコード

## 基本的な使用方法

### 1. サービスの初期化

```typescript
import { FunctionCallingService } from './services/function-calling'

const functionCalling = new FunctionCallingService()
```

### 2. ツールの作成と登録

```typescript
import { createTool, stringParam } from './utils/function-calling-helpers'

const weatherTool = createTool(
  'get_weather',
  '天気情報を取得します',
  {
    location: stringParam('場所（都市名）', true),
  },
  async (args) => {
    const { location } = args as { location: string }
    // 天気API呼び出しなどの実装
    return { location, weather: '晴れ', temperature: '20°C' }
  },
  ['location']
)

functionCalling.registerTool(weatherTool)
```

### 3. Function callingの実行

```typescript
const response = await functionCalling.callWithFunctions(
  '東京の天気を教えてください',
  {
    systemPrompt: 'あなたは親切なアシスタントです。',
    temperature: 0.1,
  }
)

console.log('AI応答:', response.content)
console.log('関数呼び出し:', response.functionCalls)
console.log('関数実行結果:', response.functionResults)
```

## 主要な機能

### FunctionCallingService
- **registerTool(tool)** - ツールを登録
- **unregisterTool(name)** - ツールの登録を解除
- **clearTools()** - 全ツールをクリア
- **getRegisteredTools()** - 登録済みツール名の一覧取得
- **callWithFunctions(message, options)** - Function callingの実行

### ヘルパー関数
- **stringParam(description, required)** - 文字列パラメータ作成
- **numberParam(description, required)** - 数値パラメータ作成
- **booleanParam(description, required)** - 真偽値パラメータ作成
- **objectParam(description, properties, required)** - オブジェクトパラメータ作成
- **arrayParam(description, items, required)** - 配列パラメータ作成
- **createTool(name, description, parameters, handler, required)** - ツール作成

### 用意されたサンプルツール
- **weatherTool** - 天気情報取得（模擬データ）
- **calculatorTool** - 数学計算実行
- **fileInfoTool** - ファイル情報取得（模擬データ）

## エラーハンドリング

- ツール実行中にエラーが発生した場合、`FunctionCallResult.error`にエラーメッセージが設定されます
- 未知の関数が呼び出された場合も適切にエラーハンドリングされます
- APIキーが設定されていない場合は初期化時にエラーが発生します

## 設定方法

環境変数 `ANTHROPIC_API_KEY` を設定してください：

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

## テスト実行

```bash
# Function callingサービスのテスト
npm test -- tests/services/function-calling.test.ts

# ヘルパー関数のテスト
npm test -- tests/utils/function-calling-helpers.test.ts

# 全テスト実行
npm test
```

## コード品質チェック

```bash
npm run lint      # Lintチェック
npm run typecheck # 型チェック
npm run format    # コードフォーマット
```

## TDD原則に基づく実装

この基盤は、CLAUDE.mdに記載されているTDD（テスト駆動開発）の原則に従って実装されています：

1. 最初にテストを作成
2. テストが通る最小限の実装を作成
3. リファクタリングで品質向上

## サンプル実行

詳細な使用例は `src/examples/function-calling-example.ts` を参照してください。このファイルには以下の例が含まれています：

- 基本的な使用例
- カスタムツールの作成例
- エラーハンドリングの例
- ツールの動的管理例