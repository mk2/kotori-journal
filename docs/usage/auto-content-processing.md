# Auto Content Processing Usage Guide

## 概要

自動コンテンツ処理機能は、特定のURLパターンにマッチするページを訪問した際に、自動的にページコンテンツを抽出し、ユーザーが事前設定したプロンプトでLLM（Claude API）に処理させる機能です。

## 前提条件

1. **Claude API キー**: `ANTHROPIC_API_KEY` 環境変数を設定する必要があります
2. **kotori-journal サーバー**: HTTPサーバーが起動している必要があります
3. **Chrome拡張**: 最新版がインストールされている必要があります

## 基本的な使用方法

### 1. サーバーの起動

```bash
# Claude API キーを設定
export ANTHROPIC_API_KEY="your-api-key-here"

# サーバーを起動
npm run dev server start
```

### 2. コンテンツパターンの作成

サーバーのAPIエンドポイントを使用してパターンを作成します：

```bash
# 例: ニュースサイトの要約パターンを作成
curl -X POST http://localhost:8765/api/content-patterns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "name": "ニュース記事要約",
    "urlPattern": "https://.*\\.com/news/.*",
    "prompt": "このニュース記事の要点を3つの箇条書きで要約してください:\n\n{content}",
    "enabled": true
  }'
```

### 3. パターンの例

以下は一般的なパターンの例です：

```json
{
  "name": "技術記事要約",
  "urlPattern": "https://qiita\\.com/.*|https://zenn\\.dev/.*",
  "prompt": "この技術記事の要点を整理して、学習のポイントを3つ挙げてください:\n\n{content}",
  "enabled": true
}
```

```json
{
  "name": "GitHub リポジトリ分析",
  "urlPattern": "https://github\\.com/.*/.*",
  "prompt": "このGitHubリポジトリについて、以下の観点で分析してください:\n1. 主な機能\n2. 使用技術\n3. 注目すべき点\n\nコンテンツ:\n{content}",
  "enabled": true
}
```

## API エンドポイント

### パターン管理

- `GET /api/content-patterns` - 全パターン取得
- `POST /api/content-patterns` - パターン作成
- `PUT /api/content-patterns/:id` - パターン更新
- `DELETE /api/content-patterns/:id` - パターン削除

### コンテンツ処理

- `POST /api/content-processing` - コンテンツ処理実行
- `GET /api/content-patterns/match/:url` - URL に対するマッチング確認

### パターン管理の例

```bash
# 全パターンを取得
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8765/api/content-patterns

# パターンを更新
curl -X PUT http://localhost:8765/api/content-patterns/PATTERN_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"enabled": false}'

# パターンを削除
curl -X DELETE http://localhost:8765/api/content-patterns/PATTERN_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## プロンプトテンプレート

プロンプト内で以下の変数を使用できます：

- `{content}` - 抽出されたページコンテンツ
- `{title}` - ページタイトル
- `{url}` - ページURL

例：
```
「{title}」について、以下の内容を基に分析してください：

{content}

分析結果を以下の形式で出力してください：
- 要約: 
- 重要なポイント: 
- 参考URL: {url}
```

## 動作確認

### 1. パターンのマッチング確認

```bash
# 特定のURLがパターンにマッチするかテスト
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8765/api/content-patterns/match/$(echo 'https://example.com/news/article' | sed 's|/|%2F|g')"
```

### 2. Chrome拡張での確認

1. 設定したパターンにマッチするページを開く
2. Developer Tools のコンソールで処理ログを確認
3. kotori-journal に新しいエントリが作成されることを確認

### 3. ログの確認

```bash
# サーバーログを確認
tail -f ~/.kotori-journal-data/server.log

# 処理されたコンテンツを確認
npm run dev entry list | grep "AI処理コンテンツ"
```

## トラブルシューティング

### Claude API エラー

```
Error: Claude AI service is not available
```

→ `ANTHROPIC_API_KEY` 環境変数が設定されているか確認

### パターンマッチングしない

1. 正規表現パターンが正しいか確認
2. パターンが有効になっているか確認
3. Chrome拡張が有効になっているか確認

### コンテンツが抽出されない

1. ページのコンテンツが十分な長さがあるか確認（50文字以上）
2. JavaScript で動的に生成されるコンテンツの場合、読み込み完了を待つ
3. Developer Tools でエラーが発生していないか確認

## 設定ファイル

パターン設定は以下に保存されます：
```
~/.kotori-journal-data/content-patterns.json
```

手動編集も可能ですが、サーバー再起動が必要です。

## セキュリティ注意事項

1. 機密情報を含むページでは使用を避ける
2. プロンプトに個人情報を含めない
3. Claude API の利用規約を遵守する
4. 大量のコンテンツ処理時はAPI制限に注意

## パフォーマンス

- コンテンツは8000文字まで制限されます
- 1ページあたりの処理時間は3-10秒程度
- 同時処理数に制限があります（Claude API の制限による）