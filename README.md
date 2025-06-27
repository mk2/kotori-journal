<div align="center">
  <img src="docs/images/kotori_original.png" alt="Kotori Journal Icon" width="200">
  
  # Kotori Journal

  プロデューサーさん！毎日を私と一緒に記録しちゃいましょう！
</div>

## 概要

Kotori Journalは、ターミナルで動作するシンプルなジャーナルアプリケーションです。日々の出来事や考えを素早く記録し、AIアシスタント（Claude）による分析・要約・アドバイスを受けることができます。

### 主な特徴

- 🖊️ **シンプルな記録機能** - ターミナルから素早くエントリーを追加
- 📁 **カテゴリ管理** - エントリーを分類して整理
- 📅 **自動日報生成** - 翌日起動時に前日の記録をMarkdown形式で保存
- 🔍 **検索機能** - キーワードや日付でエントリーを検索
- 🤖 **AI統合** - Claude AIによる質問応答、要約、アドバイス機能
- 🌐 **サーバーモード** - Web UIとAPIサーバー機能
- 💾 **自動保存** - アプリが異常終了してもデータを保護

## インストール

### 必要な環境

- Node.js 22.16.0以上

### インストール手順

```bash
# リポジトリをクローン
git clone https://github.com/mk2/kotori-journal.git
cd kotori-journal

# 依存関係をインストール
npm install

# ビルド
npm run build

# グローバルにインストール（オプション）
npm link
```

## 使い方

### 基本的な使い方

```bash
# 開発モードで起動
npm run dev

# サーバーモードで起動
npm run server

# または、グローバルインストール後
kotori
kotori server
```

### キーボードショートカット

- **Enter**: エントリーを送信
- **Tab**: カテゴリを切り替え
- **Esc**: メニューを表示
- **/**: 検索モードに移行
- **Ctrl+D**: アプリを終了

## Claude AI機能

### 設定

AI機能を使用するには、環境変数 `ANTHROPIC_API_KEY` を設定してください：

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

### AIトリガー

- **質問**: `？今日はどうでしたか` - エントリーに？を含める
- **要約**: `要約して` / `まとめて` - 今日の記録を要約
- **アドバイス**: `アドバイスして` / `助言をください` - アドバイスを取得

## データ保存

データは `kotori-journal-data/` ディレクトリにローカル保存されます：

- 日報: `2025/01/01.md` （Markdown形式）
- 設定: `categories.json`, `settings.json`
- 一時ファイル: `.temp/` （自動保存用）

## 開発

### 開発コマンド

```bash
# 開発サーバーを起動
npm run dev

# テストを実行
npm test

# ビルド
npm run build

# 型チェック
npm run typecheck

# リント
npm run lint

# フォーマット
npm run format
```

### 技術スタック

- **TypeScript** - 型安全な開発
- **Ink** - React for CLIによるリッチなUI
- **Express** - サーバーモード用
- **Vitest** - 高速なテストランナー
- **Anthropic SDK** - Claude AI統合

## ライセンス

ISC

## 貢献

Issue や Pull Request は歓迎します。大きな変更を行う場合は、まず Issue を作成して変更内容について議論してください。