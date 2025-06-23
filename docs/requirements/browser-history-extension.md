# Chrome拡張機能要件書：ブラウジング履歴記録

## 1. 概要

本ドキュメントは、Chromeで閲覧したWebサイトの履歴をkotori-journalのjournalとして記録するためのChrome拡張機能の要件を定義します。

### 1.1 目的
- ユーザーのWebブラウジング履歴を自動的に記録
- kotori-journalに統合して、日々の活動記録の一部として管理
- ページの滞在時間やOGP情報を含む詳細な記録

## 2. 機能要件

### 2.1 ブラウジング履歴の記録
- **対象**: すべてのWebサイト（プライバシー設定による除外なし）
- **記録タイミング**: リアルタイム
- **記録内容**:
  - URL
  - ページタイトル
  - 訪問時刻
  - 滞在時間（タブがアクティブな時間の累積）

### 2.2 OGP（Open Graph Protocol）情報の取得
- **取得対象メタタグ**:
  - og:title
  - og:description
  - og:image
- **取得方法**: Content Scriptを使用してページのDOMから直接取得

### 2.3 データ送信
- **送信方法**: HTTP POST（リアルタイム）
- **送信先**: kotori-journalのHTTPサーバー
- **エラー処理**: 送信失敗時の再送信機能

### 2.4 複数訪問の処理
- 同じページへの複数回の訪問はすべて個別に記録

## 3. 技術仕様

### 3.1 Chrome拡張機能側

#### 3.1.1 Manifest V3構成
```json
{
  "manifest_version": 3,
  "name": "Kotori Journal Browser History",
  "version": "1.0.0",
  "permissions": [
    "tabs",
    "webNavigation",
    "storage"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }],
  "action": {
    "default_popup": "popup.html"
  }
}
```

#### 3.1.2 主要コンポーネント

**Background Script (Service Worker)**
- タブイベントの監視
  - `chrome.tabs.onCreated`
  - `chrome.tabs.onActivated`
  - `chrome.tabs.onRemoved`
  - `chrome.tabs.onUpdated`
- 滞在時間の計測
- データの送信

**Content Script**
- OGPメタタグの取得
- ページ情報の収集

**Popup/Options**
- kotori-journalサーバーのURL設定
- 接続状態の表示

### 3.2 kotori-journal側

#### 3.2.1 HTTPサーバー機能
- **フレームワーク**: Express.js
- **ポート**: 8765（環境変数で設定可能）
- **エンドポイント**: `/api/browser-history`
- **メソッド**: POST
- **認証**: ベアラートークン（簡易認証）

#### 3.2.2 CLIコマンド
```bash
# サーバー起動
kotori server start

# サーバー停止
kotori server stop

# サーバー状態確認
kotori server status
```

## 4. データフォーマット

### 4.1 Chrome拡張機能 → kotori-journal
```typescript
interface BrowserHistoryEntry {
  url: string;
  title: string;
  visitedAt: string; // ISO 8601形式
  duration: number;  // 秒単位
  ogp?: {
    title?: string;
    description?: string;
    image?: string;
  };
}
```

### 4.2 kotori-journal内部保存形式
```typescript
interface JournalEntry {
  id: string;
  content: string; // "Visited: [title] (URL: [url], Duration: [duration]s)"
  category: string; // "Web閲覧"
  timestamp: Date;
  type: 'entry';
  metadata?: {
    url: string;
    duration: number;
    ogp?: {
      title?: string;
      description?: string;
      image?: string;
    };
  };
}
```

## 5. 実装計画

### 5.1 フェーズ1: kotori-journal側の実装
1. HTTPサーバー機能の追加
   - Express.jsのセットアップ
   - APIエンドポイントの実装
   - 認証機能の実装
2. CLIコマンドの追加
   - サーバー管理コマンド
   - 設定管理
3. テストの作成

### 5.2 フェーズ2: Chrome拡張機能の基本実装
1. プロジェクトセットアップ
   - TypeScript環境構築
   - ビルド設定
2. 基本的な履歴記録機能
   - タブイベントの監視
   - 滞在時間計測
3. データ送信機能

### 5.3 フェーズ3: 高度な機能の実装
1. OGP情報の取得
2. エラーハンドリングと再送信
3. 設定画面の実装

### 5.4 フェーズ4: テストと最適化
1. 統合テスト
2. パフォーマンス最適化
3. ドキュメント作成

## 6. セキュリティ考慮事項

### 6.1 通信セキュリティ
- ローカルホスト限定の通信
- ベアラートークンによる簡易認証
- CORS設定（localhost限定）

### 6.2 データセキュリティ
- 個人情報を含む可能性のあるデータの適切な取り扱い
- 送信データのサイズ制限（1MB/リクエスト）

### 6.3 権限の最小化
- 必要最小限の権限のみ要求
- ユーザーによる権限管理の明確化

## 7. 今後の拡張性

### 7.1 フィルタリング機能
- 特定ドメインの除外設定
- プライベートブラウジングモードの検出と除外

### 7.2 データ送信の最適化
- バッチ送信オプション
- データ圧縮
- オフライン時のキューイング

### 7.3 分析機能
- ブラウジング統計の表示
- カテゴリ別の自動分類
- AIによる閲覧パターンの分析

### 7.4 他ブラウザ対応
- Firefox版の開発
- Safari版の検討

## 8. 制約事項

### 8.1 技術的制約
- Chrome拡張機能のファイルシステムアクセス制限
- Service Workerの5分間のライフタイム制限
- Content Scriptのセキュリティ制約

### 8.2 パフォーマンス制約
- リアルタイム送信による通信頻度
- 大量タブ使用時のメモリ使用量

## 9. 成功基準

1. すべてのWebページ訪問が正確に記録される
2. 滞在時間が±5秒の精度で記録される
3. OGP情報が利用可能な場合は90%以上の取得率
4. サーバー接続エラー時の自動リトライ成功
5. ユーザーの通常のブラウジング体験に影響を与えない