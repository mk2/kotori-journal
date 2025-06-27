# Kotori Journal Chrome Extension

Kotori JournalのWebブラウジング履歴を自動記録するChrome拡張機能です。

## 機能

- **自動履歴記録**: 訪問したWebページのURL、タイトル、滞在時間を自動記録
- **OGP情報取得**: ページのOpen Graph Protocolメタデータも記録
- **リアルタイム送信**: kotori-journalサーバーにリアルタイムでデータ送信
- **設定管理**: サーバーURL、認証トークンの設定
- **プライバシー配慮**: localhostとの通信のみ許可

## セットアップ

### 1. kotori-journalサーバーの起動

```bash
# kotori-journalプロジェクトディレクトリで
npm run dev server start
```

サーバーが起動すると認証トークンが表示されます。このトークンをメモしてください。

### 2. Chrome拡張機能のビルド

```bash
# chrome-extensionディレクトリで
npm install
npm run build
```

### 3. Chromeに拡張機能をインストール

1. Chromeで `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `chrome-extension/dist` フォルダを選択

### 4. 拡張機能の設定

1. 拡張機能アイコンをクリックして設定画面を開く
2. サーバーURL: `http://localhost:8765` (デフォルト)
3. 認証トークン: サーバー起動時に表示されたトークンを入力
4. 「履歴記録を有効にする」をオンにする
5. 「保存」をクリック

## 使用方法

設定完了後、通常通りWebブラウジングを行うだけで自動的に履歴が記録されます。

記録される情報:

- 訪問URL
- ページタイトル
- 訪問時刻
- 滞在時間（秒単位）
- OGP情報（タイトル、説明、画像URL）

## 設定項目

- **サーバーURL**: kotori-journalサーバーのURL（デフォルト: http://localhost:8765）
- **認証トークン**: サーバーとの認証に使用するトークン
- **履歴記録**: 機能の有効/無効を切り替え

## 開発

### テスト実行

```bash
npm test
```

### 型チェック

```bash
npm run typecheck
```

### Lint

```bash
npm run lint
```

## ファイル構成

```
chrome-extension/
├── src/
│   ├── background.ts      # Background Service Worker
│   ├── content.ts         # Content Script
│   ├── popup.ts          # Popup UI
│   ├── types.ts          # 型定義
│   └── services/
│       ├── page-tracker.ts   # ページ追跡
│       ├── data-sender.ts    # データ送信
│       └── ogp-extractor.ts  # OGP抽出
├── tests/                # テストファイル
├── dist/                 # ビルド後ファイル
├── manifest.json         # 拡張機能マニフェスト
└── popup.html           # Popup UI HTML
```

## セキュリティ

- 通信はlocalhost限定
- CORS設定でChrome拡張機能からのアクセスのみ許可
- ベアラートークンによる認証

## トラブルシューティング

### 接続エラーの場合

1. kotori-journalサーバーが起動しているか確認
2. 認証トークンが正しいか確認
3. ポート番号が一致しているか確認

### 履歴が記録されない場合

1. 拡張機能が有効になっているか確認
2. 設定で「履歴記録を有効にする」がオンになっているか確認
3. ブラウザの開発者ツールでエラーがないか確認

## コンテンツ処理パターン例

### Redmineのチケット要約

#### URLパターン
```
https://www\.redmine\.org/issues/.*
```

#### 処理プロンプト
```
Redmineのチケットの内容を下記のフォーマットで要約してください。

<format>
## 結論
## 理由・詳細
## 基本情報
## 提案内容
## サポート状況
## 次の行動提案
</format>

<ページURL>
{url}
</ページURL>

<チケットタイトル>
{title}
</チケットタイトル>

<チケット内容>
{content}
</チケット内容>
```

### GitHubのOSSの要約

#### URLパターン
```
https://github\.com/[\w-\.]+/[\w-\.]+
```

#### 処理プロンプト
```
GitHubで公開されているOSSの内容です。要約してください。

<format>
## 基本情報
## 概要
## トレンド
</format>

<content>
{content}
</content>
```