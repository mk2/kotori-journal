# Chrome拡張機能のインストールガイド

## ビルド方法

1. **依存関係のインストール**

   ```bash
   npm install
   ```

2. **拡張機能のビルド**

   ```bash
   npm run build
   ```

3. **ビルド成果物の確認**
   `dist/` ディレクトリに以下のファイルが生成されます：
   - `manifest.json` - 拡張機能の設定ファイル
   - `background.js` - バックグラウンドサービスワーカー
   - `content.js` - OGP抽出用コンテンツスクリプト
   - `auto-processor.js` - 自動コンテンツ処理用コンテンツスクリプト
   - `popup.html`, `popup.js` - 設定用ポップアップ
   - `icon16.png`, `icon48.png`, `icon128.png` - アイコンファイル

## Chrome拡張機能のインストール

1. **デベロッパーモードを有効化**
   - Chrome で `chrome://extensions/` を開く
   - 右上の「デベロッパーモード」をONにする

2. **拡張機能を読み込み**
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - `dist/` ディレクトリを選択

3. **拡張機能の確認**
   - 拡張機能一覧に「Kotori Journal Browser History」が表示される
   - ツールバーに「K」アイコンが表示される

## 設定方法

1. **サーバーの起動**

   ```bash
   cd /workspaces/kotori-journal

   # Claude API キーを設定（自動コンテンツ処理を使用する場合）
   export ANTHROPIC_API_KEY="your-api-key-here"

   # サーバーを起動
   npm run dev server start
   ```

2. **拡張機能の設定**
   - Chrome のツールバーで「K」アイコンをクリック
   - サーバーURL: `http://localhost:8765` （デフォルト）
   - 認証トークン: サーバー起動時に表示されるトークンを入力
   - 「履歴記録を有効にする」をONにする
   - 「保存」をクリック

3. **接続テスト**
   - 「接続テスト」ボタンをクリックして接続を確認
   - ステータスが「サーバーに接続済み」になることを確認

## 機能確認

### 基本的な履歴記録

1. 任意のWebページを開く
2. しばらく閲覧して別のタブに移動
3. kotori-journal で履歴が記録されていることを確認
   ```bash
   npm run dev entry list | grep "Web閲覧"
   ```

### 自動コンテンツ処理（Claude API必要）

1. コンテンツパターンを作成

   ```bash
   curl -X POST http://localhost:8765/api/content-patterns \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
     -d '{
       "name": "テストパターン",
       "urlPattern": "https://example\\.com/.*",
       "prompt": "このページの内容を100文字で要約してください:\n\n{content}",
       "enabled": true
     }'
   ```

2. パターンにマッチするページを開く
3. Developer Tools のコンソールで処理ログを確認
4. kotori-journal に「AI処理コンテンツ」カテゴリでエントリが作成されることを確認

## トラブルシューティング

### 拡張機能が動作しない

- Developer Tools のコンソールでエラーを確認
- 拡張機能の再読み込みを試す
- `chrome://extensions/` でエラーが表示されていないか確認

### サーバーに接続できない

- サーバーが起動しているか確認: `npm run dev server status`
- 認証トークンが正しいか確認
- ファイアウォール設定を確認

### 自動コンテンツ処理が動作しない

- `ANTHROPIC_API_KEY` 環境変数が設定されているか確認
- サーバーログを確認: `tail -f ~/.kotori-journal-data/server.log`
- URLパターンが正しくマッチしているか確認

## 開発者向け

### 開発モード

```bash
# ファイル変更を監視してビルド
npm run dev

# lint とタイプチェック
npm run lint
npm run typecheck

# テスト実行
npm test
```

### デバッグ

- Chrome Developer Tools で拡張機能をデバッグ可能
- Background Script: `chrome://extensions/` → 拡張機能の詳細 → 「バックグラウンドページ」
- Content Script: 通常のページの Developer Tools で確認
