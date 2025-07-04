export interface SeparatorOptions {
  /** 区切り線に使用する文字（デフォルト: '─'） */
  character?: string
  /** 最小幅（デフォルト: なし） */
  minWidth?: number
  /** 最大幅（デフォルト: なし） */
  maxWidth?: number
}

/**
 * 指定された幅で区切り線を生成する
 * @param width 区切り線の幅
 * @param options 区切り線のオプション
 * @returns 生成された区切り線文字列
 */
export function generateSeparator(width: number, options: SeparatorOptions = {}): string {
  const { character = '─', minWidth, maxWidth } = options

  // 負の値や0の場合は空文字を返す
  if (width <= 0) {
    return ''
  }

  let actualWidth = width

  // 最小幅の制約を適用
  if (minWidth !== undefined && actualWidth < minWidth) {
    actualWidth = minWidth
  }

  // 最大幅の制約を適用
  if (maxWidth !== undefined && actualWidth > maxWidth) {
    actualWidth = maxWidth
  }

  // minWidth > maxWidth の場合は maxWidth を優先
  if (minWidth !== undefined && maxWidth !== undefined && minWidth > maxWidth) {
    actualWidth = maxWidth
  }

  return character.repeat(actualWidth)
}

/**
 * 端末に適した区切り線を生成する（デフォルト設定）
 * @param terminalWidth 端末の幅
 * @returns 端末に適した区切り線
 */
export function generateTerminalSeparator(terminalWidth: number): string {
  return generateSeparator(terminalWidth, {
    minWidth: 10,
    maxWidth: 80,
  })
}
