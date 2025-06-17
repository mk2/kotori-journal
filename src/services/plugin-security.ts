import * as path from 'path'
import * as fs from 'fs/promises'
import { existsSync } from 'fs'

export class PluginSecurityManager {
  constructor(private dataPath: string) {}

  async validateLocalPath(pluginPath: string): Promise<void> {
    // パストラバーサル攻撃防止
    const resolved = path.resolve(pluginPath)
    const allowedPaths = [
      path.resolve('./plugins'),
      path.resolve(
        process.env.KOTORI_PLUGIN_PATH || path.join(process.env.HOME || '~', 'kotori-plugins')
      ),
    ]

    if (!allowedPaths.some(allowed => resolved.startsWith(allowed))) {
      throw new Error('Plugin path not allowed for security reasons')
    }

    // 危険なファイルの検出
    await this.scanForMaliciousCode(resolved)
  }

  async scanForMaliciousCode(pluginPath: string): Promise<void> {
    if (!existsSync(pluginPath)) {
      throw new Error(`Plugin path does not exist: ${pluginPath}`)
    }

    // ディレクトリ内の全ファイルを検索
    const files = await this.findFiles(pluginPath, /\.(js|ts)$/)

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8')

      // 危険なパターンチェック
      const dangerousPatterns = [
        {
          pattern: /require\(['"]child_process['"]\)/,
          description: 'child_process module usage',
        },
        {
          pattern: /import.*child_process/,
          description: 'child_process module import',
        },
        {
          pattern: /eval\(/,
          description: 'eval() function usage',
        },
        {
          pattern: /Function\(/,
          description: 'Function constructor usage',
        },
        {
          pattern: /process\.exit/,
          description: 'process.exit() usage',
        },
        {
          pattern: /require\(['"]fs['"]\)/,
          description: 'direct fs module usage (use restricted storage instead)',
        },
        {
          pattern: /require\(['"]http['"]\)/,
          description: 'direct http module usage (use restricted network instead)',
        },
        {
          pattern: /require\(['"]https['"]\)/,
          description: 'direct https module usage (use restricted network instead)',
        },
      ]

      for (const { pattern, description } of dangerousPatterns) {
        if (pattern.test(content)) {
          throw new Error(`Potentially dangerous code detected in ${file}: ${description}`)
        }
      }
    }
  }

  private async findFiles(dir: string, pattern: RegExp): Promise<string[]> {
    const result: string[] = []

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          // node_modules や .git ディレクトリをスキップ
          if (!['node_modules', '.git', '.svn', '.hg'].includes(entry.name)) {
            const subFiles = await this.findFiles(fullPath, pattern)
            result.push(...subFiles)
          }
        } else if (entry.isFile() && pattern.test(entry.name)) {
          result.push(fullPath)
        }
      }
    } catch {
      // ディレクトリアクセスエラーは無視
    }

    return result
  }

  validatePluginConfig(config: unknown): boolean {
    if (!config || typeof config !== 'object') {
      return false
    }

    const pluginConfig = config as Record<string, unknown>

    // 必須フィールドの存在確認
    const requiredFields = ['name', 'version', 'description']
    for (const field of requiredFields) {
      if (!pluginConfig[field] || typeof pluginConfig[field] !== 'string') {
        return false
      }
    }

    // 危険な設定値のチェック
    if (pluginConfig.permissions) {
      const permissions = pluginConfig.permissions as string[]
      const dangerousPermissions = ['file_system_full', 'network_unrestricted', 'process_control']

      if (dangerousPermissions.some(perm => permissions.includes(perm))) {
        return false
      }
    }

    return true
  }

  createSandboxedRequire() {
    // プラグインで使用可能なモジュールのホワイトリスト
    const allowedModules = new Set(['path', 'util', 'crypto', 'events', 'stream'])

    // eslint-disable-next-line no-undef
    const nodeRequire = require

    return (moduleName: string): unknown => {
      if (allowedModules.has(moduleName)) {
        return nodeRequire(moduleName)
      }

      throw new Error(`Module '${moduleName}' is not allowed in plugins`)
    }
  }
}

export class PluginSandbox {
  constructor(private securityManager: PluginSecurityManager) {}

  createContext(pluginName: string, dataPath: string) {
    return {
      // 制限されたAPI
      storage: this.createRestrictedStorage(pluginName, dataPath),
      network: this.createRestrictedNetwork(),
      // プラグイン専用データ領域
      dataPath: path.join(dataPath, 'plugins', pluginName, 'data'),
      require: this.securityManager.createSandboxedRequire(),
    }
  }

  private createRestrictedStorage(pluginName: string, dataPath: string) {
    const pluginDataPath = path.join(dataPath, 'plugins', pluginName, 'data')

    return {
      async read(key: string): Promise<string | null> {
        // キー名の検証
        if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
          throw new Error(
            'Invalid storage key. Only alphanumeric characters, underscore, and hyphen are allowed.'
          )
        }

        const filePath = path.join(pluginDataPath, `${key}.json`)
        if (existsSync(filePath)) {
          return fs.readFile(filePath, 'utf-8')
        }
        return null
      },

      async write(key: string, value: string): Promise<void> {
        // キー名の検証
        if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
          throw new Error(
            'Invalid storage key. Only alphanumeric characters, underscore, and hyphen are allowed.'
          )
        }

        // 値のサイズ制限（1MB）
        if (value.length > 1024 * 1024) {
          throw new Error('Storage value too large. Maximum size is 1MB.')
        }

        if (!existsSync(pluginDataPath)) {
          await fs.mkdir(pluginDataPath, { recursive: true })
        }
        const filePath = path.join(pluginDataPath, `${key}.json`)
        await fs.writeFile(filePath, value, 'utf-8')
      },

      async delete(key: string): Promise<void> {
        if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
          throw new Error('Invalid storage key.')
        }

        const filePath = path.join(pluginDataPath, `${key}.json`)
        if (existsSync(filePath)) {
          await fs.rm(filePath)
        }
      },

      async list(): Promise<string[]> {
        if (!existsSync(pluginDataPath)) {
          return []
        }
        const files = await fs.readdir(pluginDataPath)
        return files.filter(f => f.endsWith('.json')).map(f => f.slice(0, -5))
      },
    }
  }

  private createRestrictedNetwork() {
    const allowedDomains = ['api.openweathermap.org', 'httpbin.org', 'api.github.com']

    return {
      async fetch(url: string, options?: Record<string, unknown>): Promise<unknown> {
        // 基本的なURL検証
        const urlObj = new globalThis.URL(url)

        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          throw new Error('Only HTTP and HTTPS protocols are allowed')
        }

        // ドメインホワイトリストチェック
        if (!allowedDomains.some(domain => urlObj.hostname.endsWith(domain))) {
          throw new Error(`Access to domain '${urlObj.hostname}' is not allowed`)
        }

        // レート制限（簡易版）
        // 実際の実装では、より詳細なレート制限を実装する必要があります

        return globalThis.fetch(url, {
          ...options,
          // セキュリティヘッダーを追加
          headers: {
            ...(options?.headers as Record<string, string>),
            'User-Agent': 'kotori-journal-plugin/1.0.0',
          },
        })
      },
    }
  }
}
