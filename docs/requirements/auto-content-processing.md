# Auto Content Processing Feature Requirements

## 概要

特定のURLパターンにマッチするページを訪問した際に、自動的にページコンテンツを取得し、ユーザーが事前設定したプロンプトでLLM（Anthropic Claude API）に処理させる機能。

## 機能要件

### 1. URL パターンマッチング設定

#### 1.1 パターン管理
- ユーザーがURLパターンを登録・編集・削除できる
- パターンは正規表現または glob パターンをサポート
- 複数のパターンを設定可能

#### 1.2 パターン例
```
https://example.com/news/*
https://.*\.example\.com/article/.*
https://github.com/.*/.*
```

### 2. プロンプト設定

#### 2.1 プロンプト管理
- 各URLパターンに対応するプロンプトを設定可能
- プロンプトテンプレートの保存・編集・削除
- プロンプト内で変数置換をサポート（URL、タイトル等）

#### 2.2 プロンプト例
```
このページの主要なニュース内容を200文字以内で要約してください。
ページ内の特定のコンテンツ（商品情報）を抽出して構造化してください。
この技術記事の要点を箇条書きで3点に整理してください。
```

### 3. コンテンツ取得

#### 3.1 ページコンテンツの抽出
- ページのHTML全体を取得
- 主要コンテンツの抽出（article、main、content等の要素）
- 不要な要素の除去（nav、footer、ads等）
- テキストコンテンツの正規化

#### 3.2 コンテンツの前処理
- HTMLタグの除去
- 余分な空白・改行の正規化
- 文字数制限の適用（LLMのトークン制限を考慮）

### 4. LLM処理

#### 4.1 API連携
- Anthropic Claude APIとの連携
- サーバーサイド（kotori-journal）でAPI呼び出し実行
- レート制限・エラーハンドリング

#### 4.2 処理フロー
1. Chrome拡張からページコンテンツをサーバーに送信
2. サーバーでプロンプトとコンテンツを組み合わせ
3. Claude APIに送信
4. レスポンスをジャーナルエントリとして保存

### 5. Chrome拡張機能の拡張

#### 5.1 設定UI
- ポップアップまたは設定ページでパターン・プロンプト管理
- パターンの有効/無効切り替え
- 処理状況の表示

#### 5.2 コンテンツ抽出
- Content Scriptでページコンテンツを取得
- DOMから主要コンテンツを抽出
- Background Scriptでサーバーに送信

### 6. サーバーサイド実装

#### 6.1 新規API エンドポイント
```
POST /api/content-processing
- URL、コンテンツ、パターンIDを受信
- 対応するプロンプトを取得
- Claude APIで処理
- 結果をジャーナルエントリとして保存
```

#### 6.2 設定管理
```
GET/POST/PUT/DELETE /api/content-patterns
- URLパターンとプロンプトの CRUD操作
```

### 7. データモデル

#### 7.1 ContentPattern
```typescript
interface ContentPattern {
  id: string
  name: string // 設定名（ユーザーが識別しやすい名前）
  urlPattern: string // URLパターン（正規表現）
  prompt: string // LLMへのプロンプト
  enabled: boolean // 有効/無効
  createdAt: Date
  updatedAt: Date
}
```

#### 7.2 ContentProcessingRequest
```typescript
interface ContentProcessingRequest {
  url: string
  title: string
  content: string // 抽出されたページコンテンツ
  patternId: string
}
```

### 8. ユーザーエクスペリエンス

#### 8.1 処理の可視化
- 処理中であることをユーザーに通知
- 処理完了時の通知
- エラー時の適切なメッセージ表示

#### 8.2 設定の簡単さ
- 一般的なサイト用のプリセットパターン・プロンプト提供
- パターンの動作テスト機能
- プロンプトのプレビュー機能

### 9. 非機能要件

#### 9.1 パフォーマンス
- ページ読み込み速度への影響を最小限に
- コンテンツ処理の非同期実行
- 大きなページでの処理時間制限

#### 9.2 セキュリティ
- 機密情報を含むページの除外オプション
- ユーザーの同意なしにコンテンツ送信しない設定
- API キーの安全な管理

#### 9.3 プライバシー
- 処理したコンテンツの保存期間設定
- オプトアウト機能
- ローカル処理オプション（将来的）

### 10. 実装フェーズ

#### Phase 1: 基本機能
- URLパターンマッチング
- 基本的なコンテンツ抽出
- シンプルなプロンプト処理

#### Phase 2: UI/UX改善
- 設定画面の充実
- プリセットパターンの提供
- 処理状況の可視化

#### Phase 3: 高度機能
- 複雑なコンテンツ抽出
- プロンプトテンプレート
- 処理結果の分析・整理

## 技術仕様

### Chrome拡張
- Manifest V3
- Content Scripts でのDOM操作
- Background Service Worker でのAPI通信

### サーバーサイド
- Express.js での新規エンドポイント
- Anthropic Claude API連携
- パターン設定の永続化

### データストレージ
- パターン設定: ローカルファイル（JSON）
- 処理結果: 既存のジャーナルシステム