import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

/**
 * 環境変数ファイルの内容をパースして環境変数に設定する
 * @param content ファイルの内容
 */
function parseEnvContent(content: string): void {
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmedLine = line.trim()

    // 空行やコメント行をスキップ
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue
    }

    // = が含まれていない行をスキップ
    const equalIndex = trimmedLine.indexOf('=')
    if (equalIndex === -1 || equalIndex === 0) {
      continue
    }

    const key = trimmedLine.substring(0, equalIndex).trim()
    let value = trimmedLine.substring(equalIndex + 1).trim()

    // クォートを除去
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    // 環境変数に設定（既存の値を上書き）
    process.env[key] = value
  }
}

/**
 * .envファイルとホームディレクトリの.kotori-journalファイルから環境変数を読み込む
 * .kotori-journalファイルの変数は.envファイルの変数を上書きする
 */
export function loadEnvironmentVariables(): void {
  // .envファイルを読み込み
  if (fs.existsSync('.env')) {
    try {
      const envContent = fs.readFileSync('.env', 'utf8')
      parseEnvContent(envContent)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Warning: Failed to read .env file:', error)
    }
  }

  // ホームディレクトリの.kotori-journalファイルを読み込み
  const homeDir = os.homedir()
  const kotoriJournalPath = path.join(homeDir, '.kotori-journal')

  if (fs.existsSync(kotoriJournalPath)) {
    try {
      const kotoriContent = fs.readFileSync(kotoriJournalPath, 'utf8')
      parseEnvContent(kotoriContent)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Warning: Failed to read .kotori-journal file:', error)
    }
  }
}
