export interface HeaderTextResult {
  helpText: string
  aiText: string
  pluginText: string
}

/**
 * 文字列を指定された最大長に切り詰める
 * @param text 切り詰める文字列
 * @param maxLength 最大長
 * @returns 切り詰められた文字列
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  // 最後に "..." を追加するため、3文字分を予約
  const truncated = text.slice(0, maxLength - 3).trim()
  return `${truncated}...`
}

/**
 * 完全なヘッダーテキストを単一の文字列として結合し、必要に応じて切り詰める
 * @param headerTexts generateHeaderTextの結果
 * @param maxWidth 最大幅（オプション）
 * @returns 結合されたヘッダーテキスト
 */
export function combineHeaderText(headerTexts: HeaderTextResult, maxWidth?: number): string {
  let combined = `Kotori - ${headerTexts.helpText}`

  if (headerTexts.aiText) {
    combined += ` | ${headerTexts.aiText}`
  }

  if (headerTexts.pluginText) {
    combined += ` | ${headerTexts.pluginText}`
  }

  // 最大幅が指定されている場合は切り詰める
  if (maxWidth && combined.length > maxWidth) {
    return truncateText(combined, maxWidth)
  }

  return combined
}

/**
 * 画面幅に応じてヘッダーテキストを生成する
 * @param width 画面幅（文字数）
 * @param isAIAvailable AI機能が利用可能かどうか
 * @param hasPlugins プラグインシステムが利用可能かどうか
 * @returns ヘッダーテキストの各部分
 */
export function generateHeaderText(
  width: number,
  isAIAvailable: boolean,
  hasPlugins: boolean
): HeaderTextResult {
  let helpText = ''
  let aiText = ''
  let pluginText = ''

  // ヘルプテキストの生成
  if (width <= 20) {
    // 非常に狭い画面: 最低限の情報のみ
    helpText = 'Enter送信'
  } else if (width < 60) {
    // 狭い画面: コンパクト版
    helpText = 'Enter送信 | Tab切替 | Esc メニュー'
  } else if (width < 100) {
    // 中程度の画面: 中間版
    helpText = 'Enter で送信 | Tab でカテゴリ切替 | Esc でメニュー | Ctrl+F で検索'
  } else {
    // 広い画面: フル版
    helpText =
      'Enter で送信 | Ctrl+J で改行 | Tab でカテゴリ切替 | Esc でメニュー | Ctrl+F で検索 | / でコマンド | Ctrl+D で終了'
  }

  // AI機能テキストの生成
  if (isAIAvailable) {
    if (width < 60) {
      aiText = 'AI可'
    } else if (width < 100) {
      aiText = 'AI利用可能'
    } else {
      aiText = 'AI利用可能(/? 質問, /summary, /advice)'
    }
  }

  // プラグインシステムテキストの生成
  if (hasPlugins) {
    if (width < 60) {
      pluginText = 'プラグイン可'
    } else {
      pluginText = 'プラグインシステム利用可能'
    }
  }

  return {
    helpText,
    aiText,
    pluginText,
  }
}

/**
 * 現在の端末の幅を取得する
 * @returns 端末の幅（文字数）、取得できない場合は80をデフォルトとする
 */
export function getTerminalWidth(): number {
  if (process.stdout && process.stdout.columns) {
    return process.stdout.columns
  }
  // デフォルト値
  return 80
}
