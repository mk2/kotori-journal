import { promises as fs } from 'fs'

/**
 * ディレクトリが存在することを確認し、必要に応じて作成する
 * 既存のディレクトリやシンボリックリンクも適切に処理する
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    const stats = await fs.lstat(dirPath)

    if (stats.isDirectory()) {
      // 既にディレクトリとして存在している場合はOK
      return
    }

    if (stats.isSymbolicLink()) {
      // シンボリックリンクの場合、リンク先を確認
      try {
        const realPath = await fs.realpath(dirPath)
        const realStats = await fs.stat(realPath)

        if (realStats.isDirectory()) {
          // シンボリックリンクがディレクトリを指している場合はOK
          return
        } else {
          // シンボリックリンクがファイルを指している場合はエラー
          throw new Error(`Path ${dirPath} exists as a symbolic link to a file, not a directory`)
        }
      } catch (error) {
        // シンボリックリンクが壊れている場合
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new Error(`Path ${dirPath} exists as a broken symbolic link`)
        }
        throw error
      }
    } else {
      // ファイルとして存在している場合はエラー
      throw new Error(`Path ${dirPath} exists as a file, not a directory`)
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // パスが存在しない場合は、ディレクトリを作成
      await fs.mkdir(dirPath, { recursive: true })
    } else {
      // その他のエラーは再スロー
      throw error
    }
  }
}

/**
 * ディレクトリパスが有効かどうかをチェックする
 * （ディレクトリまたはディレクトリへのシンボリックリンクである）
 */
export async function isValidDirectory(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.lstat(dirPath)

    if (stats.isDirectory()) {
      return true
    }

    if (stats.isSymbolicLink()) {
      try {
        const realPath = await fs.realpath(dirPath)
        const realStats = await fs.stat(realPath)
        return realStats.isDirectory()
      } catch {
        // 壊れたシンボリックリンク
        return false
      }
    }

    return false
  } catch {
    return false
  }
}
