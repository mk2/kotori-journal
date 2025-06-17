# プラグインシステム設計仕様

## 概要

kotori-journalに拡張機能を追加するためのプラグインシステムの設計仕様です。コマンド拡張システムを基盤とし、npm、ローカル、Gitリポジトリからのプラグインインストールに対応します。

## 1. アーキテクチャ設計

### 1.1 コマンドインターフェース

```typescript
interface Command {
  name: string
  triggers: string[] | RegExp[]
  description: string
  execute(context: CommandContext): Promise<CommandResult>
  canExecute?(context: CommandContext): boolean
}

interface CommandContext {
  input: string
  entries: JournalEntry[]
  services: {
    journal: JournalService
    storage: StorageService
    search: SearchService
  }
  ui: UIContext
}

interface CommandResult {
  type: 'display' | 'action' | 'error'
  content: string
  data?: any
}
```

### 1.2 コマンドレジストリ

```typescript
class CommandRegistry {
  private commands: Map<string, Command>
  private plugins: Map<string, Plugin>
  
  register(command: Command): void
  unregister(name: string): void
  findCommand(input: string): Command | null
  loadPlugin(packageName: string): Promise<void>
}
```

## 2. プラグインインターフェース

### 2.1 基本プラグイン構造

```typescript
interface Plugin {
  name: string
  version: string
  description: string
  author: string
  commands?: Command[]
  hooks?: PluginHooks
  uiComponents?: UIComponent[]
  initialize(context: PluginContext): Promise<void>
  dispose?(): Promise<void>
}

interface PluginContext {
  config: Config
  dataPath: string
  storage: RestrictedStorage
  network: RestrictedNetwork
  logger: Logger
}

interface PluginHooks {
  beforeSave?: (entry: JournalEntry) => Promise<JournalEntry>
  afterSave?: (entry: JournalEntry) => Promise<void>
  beforeSearch?: (query: string) => Promise<string>
  afterSearch?: (results: JournalEntry[]) => Promise<JournalEntry[]>
}
```

### 2.2 プラグイン設定

```json
{
  "kotori-plugins": {
    "weather": {
      "source": "npm",
      "package": "@kotori/weather-plugin",
      "version": "^1.0.0",
      "enabled": true,
      "config": {
        "apiKey": "env:WEATHER_API_KEY"
      }
    },
    "custom-analyzer": {
      "source": "local",
      "path": "./plugins/custom-analyzer",
      "enabled": true
    },
    "dev-plugin": {
      "source": "local",
      "path": "/absolute/path/to/dev-plugin",
      "enabled": false
    },
    "git-plugin": {
      "source": "git",
      "repository": "https://github.com/user/kotori-plugin.git",
      "branch": "main",
      "enabled": true
    }
  }
}
```

## 3. プラグインソース管理

### 3.1 マルチソースプラグインローダー

```typescript
interface PluginSource {
  type: 'npm' | 'local' | 'git'
  identifier: string
  version?: string
  path?: string
  repository?: string
  branch?: string
}

class PluginSourceManager {
  async loadPlugin(source: PluginSource): Promise<Plugin> {
    switch (source.type) {
      case 'npm':
        return this.loadNpmPlugin(source)
      case 'local':
        return this.loadLocalPlugin(source)
      case 'git':
        return this.loadGitPlugin(source)
    }
  }

  private async loadNpmPlugin(source: PluginSource): Promise<Plugin> {
    // npm install実行
    await this.ensureNpmPackage(source.identifier, source.version)
    
    // node_modulesから動的import
    const module = await import(source.identifier)
    return this.validateAndWrapPlugin(module.default)
  }

  private async loadLocalPlugin(source: PluginSource): Promise<Plugin> {
    // ローカルパスの解決
    const resolvedPath = path.resolve(source.path!)
    
    // セキュリティチェック
    await this.validateLocalPath(resolvedPath)
    
    // TypeScript/JavaScript判定とコンパイル
    const modulePath = await this.prepareLocalModule(resolvedPath)
    
    // 動的import
    const module = await import(modulePath)
    return this.validateAndWrapPlugin(module.default)
  }

  private async loadGitPlugin(source: PluginSource): Promise<Plugin> {
    // 一時ディレクトリにclone
    const tempDir = await this.cloneRepository(source.repository!, source.branch)
    
    // 依存関係インストール
    await this.installDependencies(tempDir)
    
    // ビルド実行
    await this.buildPlugin(tempDir)
    
    // ロード
    const module = await import(path.join(tempDir, 'dist/index.js'))
    return this.validateAndWrapPlugin(module.default)
  }
}
```

## 4. 本番環境プラグイン配置

### 4.1 ディレクトリ構造

```
~/.kotori-journal-data/
├── plugins/                    # プラグイン配置ルート
│   ├── npm/                   # npmプラグイン
│   │   ├── node_modules/      # npm install先
│   │   ├── package.json       # プラグイン依存関係管理
│   │   └── package-lock.json
│   ├── local/                 # ローカルプラグイン
│   │   ├── weather-plugin/
│   │   └── custom-stats/
│   ├── git/                   # Gitプラグイン
│   │   ├── community-plugin/
│   │   └── analytics-plugin/
│   └── cache/                 # コンパイル済みキャッシュ
│       ├── npm/
│       ├── local/
│       └── git/
├── 2025/                      # 既存のジャーナルデータ
├── categories.json
├── settings.json
└── plugins.json               # プラグイン設定
```

### 4.2 NPMプラグイン管理

```typescript
class NpmPluginManager {
  private get npmPluginDir(): string {
    return path.join(this.dataPath, 'plugins', 'npm')
  }

  async installNpmPlugin(packageName: string, version?: string): Promise<void> {
    // 専用のpackage.jsonで管理
    const packageJsonPath = path.join(this.npmPluginDir, 'package.json')
    
    if (!await fs.pathExists(packageJsonPath)) {
      await this.createPluginPackageJson()
    }

    // npm install実行
    await this.execNpmInstall(packageName, version)
    
    // プラグイン登録
    await this.registerPlugin(packageName, 'npm')
  }

  private async createPluginPackageJson(): Promise<void> {
    const packageJson = {
      name: "kotori-journal-plugins",
      version: "1.0.0",
      private: true,
      dependencies: {}
    }
    
    await fs.writeJson(
      path.join(this.npmPluginDir, 'package.json'), 
      packageJson, 
      { spaces: 2 }
    )
  }
}
```

### 4.3 ローカルプラグイン管理

```typescript
class LocalPluginManager {
  private get localPluginDir(): string {
    return path.join(this.dataPath, 'plugins', 'local')
  }

  async installLocalPlugin(sourcePath: string, pluginName?: string): Promise<void> {
    const targetName = pluginName || path.basename(sourcePath)
    const targetPath = path.join(this.localPluginDir, targetName)

    if (path.isAbsolute(sourcePath)) {
      // 絶対パス: シンボリックリンク作成
      await fs.ensureSymlink(sourcePath, targetPath)
    } else {
      // 相対パス: ファイルコピー
      await fs.copy(sourcePath, targetPath)
    }

    // 依存関係がある場合はインストール
    await this.installLocalDependencies(targetPath)
    
    // プラグイン登録
    await this.registerPlugin(targetName, 'local')
  }

  private async installLocalDependencies(pluginPath: string): Promise<void> {
    const packageJsonPath = path.join(pluginPath, 'package.json')
    
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath)
      
      if (packageJson.dependencies || packageJson.devDependencies) {
        // プラグイン内でnpm install実行
        await execAsync('npm install', { cwd: pluginPath })
      }
    }
  }
}
```

### 4.4 Gitプラグイン管理

```typescript
class GitPluginManager {
  private get gitPluginDir(): string {
    return path.join(this.dataPath, 'plugins', 'git')
  }

  async installGitPlugin(repoUrl: string, branch: string = 'main'): Promise<void> {
    const pluginName = this.extractRepoName(repoUrl)
    const targetPath = path.join(this.gitPluginDir, pluginName)

    // Git clone
    await execAsync(`git clone -b ${branch} ${repoUrl} ${targetPath}`)

    // 依存関係インストール
    await this.installGitDependencies(targetPath)

    // ビルド実行（必要に応じて）
    await this.buildGitPlugin(targetPath)

    // プラグイン登録
    await this.registerPlugin(pluginName, 'git', { repoUrl, branch })
  }

  private async buildGitPlugin(pluginPath: string): Promise<void> {
    const packageJsonPath = path.join(pluginPath, 'package.json')
    
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath)
      
      if (packageJson.scripts?.build) {
        await execAsync('npm run build', { cwd: pluginPath })
      }
    }
  }
}
```

## 5. 開発サポート

### 5.1 ローカル開発ディレクトリ構造

```
kotori-journal/
├── plugins/
│   ├── local-plugin-1/
│   │   ├── package.json
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── dist/
│   └── custom-stats/
│       ├── index.js
│       └── config.json
├── .kotori/
│   ├── plugins.json
│   └── plugin-cache/
└── src/
```

### 5.2 TypeScript自動コンパイル

```typescript
class LocalPluginBuilder {
  async prepareLocalModule(pluginPath: string): Promise<string> {
    const packageJson = await this.readPackageJson(pluginPath)
    
    if (packageJson?.main?.endsWith('.ts')) {
      // TypeScriptの場合、動的コンパイル
      return this.compileTypeScript(pluginPath)
    } else {
      // JavaScriptの場合、そのまま使用
      return path.join(pluginPath, packageJson.main || 'index.js')
    }
  }

  private async compileTypeScript(pluginPath: string): Promise<string> {
    const ts = await import('typescript')
    const configPath = path.join(pluginPath, 'tsconfig.json')
    
    // tsconfig.jsonロード
    const config = ts.readConfigFile(configPath, ts.sys.readFile)
    
    // コンパイル実行
    const program = ts.createProgram([
      path.join(pluginPath, 'src/index.ts')
    ], config.config.compilerOptions)
    
    // 出力ディレクトリに保存
    const outputPath = path.join(pluginPath, 'dist/index.js')
    program.emit()
    
    return outputPath
  }
}
```

### 5.3 ホットリロード機能

```typescript
class DevModeManager {
  async enableDevMode(pluginPath: string): Promise<void> {
    // ファイル監視
    const watcher = chokidar.watch(pluginPath, {
      ignored: /node_modules|\.git/,
      persistent: true
    })

    watcher.on('change', async (changedPath) => {
      console.log(`Plugin changed: ${changedPath}`)
      
      // プラグイン再ロード
      await this.reloadPlugin(pluginPath)
      
      // UIに通知
      this.notifyReload()
    })
  }
}
```

## 6. プラグイン管理コマンド

### 6.1 CLI拡張

```bash
# npmからインストール
kotori plugin install @kotori/weather-plugin

# ローカルプラグインを登録
kotori plugin add ./my-plugin

# 絶対パスでローカルプラグイン登録
kotori plugin add /Users/dev/kotori-plugins/analyzer

# Gitリポジトリからインストール
kotori plugin install git+https://github.com/user/plugin.git

# プラグイン一覧
kotori plugin list

# プラグイン有効/無効
kotori plugin enable weather
kotori plugin disable weather

# 開発モード（ホットリロード）
kotori plugin dev ./my-plugin
```

### 6.2 プラグインテンプレート生成

```bash
# 新しいプラグインプロジェクト作成
kotori plugin create my-weather-plugin

# 生成されるファイル構造
my-weather-plugin/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   └── commands/
│       └── weather.ts
├── test/
│   └── index.test.ts
└── README.md
```

## 7. セキュリティ

### 7.1 プラグインサンドボックス

```typescript
class PluginSandbox {
  createContext(plugin: Plugin): PluginContext {
    return {
      // 制限されたAPI
      storage: createRestrictedStorage(),
      network: createRestrictedNetwork(),
      // プラグイン専用データ領域
      dataPath: `/plugins/${plugin.name}/data`
    }
  }
}
```

### 7.2 ローカルプラグイン検証

```typescript
class PluginSecurityManager {
  async validateLocalPath(pluginPath: string): Promise<void> {
    // パストラバーサル攻撃防止
    const resolved = path.resolve(pluginPath)
    const allowedPaths = [
      path.resolve('./plugins'),
      path.resolve(process.env.KOTORI_PLUGIN_PATH || '~/kotori-plugins')
    ]
    
    if (!allowedPaths.some(allowed => resolved.startsWith(allowed))) {
      throw new Error('Plugin path not allowed')
    }
    
    // 危険なファイルの検出
    await this.scanForMaliciousCode(resolved)
  }

  async scanForMaliciousCode(pluginPath: string): Promise<void> {
    // 基本的な静的解析
    const files = await glob(path.join(pluginPath, '**/*.{js,ts}'))
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8')
      
      // 危険なパターンチェック
      const dangerousPatterns = [
        /require\(['"]child_process['"]\)/,
        /import.*child_process/,
        /eval\(/,
        /Function\(/,
        /process\.exit/
      ]
      
      if (dangerousPatterns.some(pattern => pattern.test(content))) {
        throw new Error(`Potentially dangerous code detected in ${file}`)
      }
    }
  }
}
```

## 8. プラグイン設定管理

### 8.1 plugins.json設定ファイル

```json
{
  "plugins": {
    "weather-plugin": {
      "type": "npm",
      "package": "@kotori/weather-plugin",
      "version": "1.2.0",
      "enabled": true,
      "installPath": "~/.kotori-journal-data/plugins/npm/node_modules/@kotori/weather-plugin",
      "installedAt": "2025-01-15T10:30:00Z"
    },
    "custom-analyzer": {
      "type": "local",
      "sourcePath": "./my-plugins/analyzer",
      "enabled": true,
      "installPath": "~/.kotori-journal-data/plugins/local/custom-analyzer",
      "installedAt": "2025-01-15T11:00:00Z"
    },
    "community-stats": {
      "type": "git",
      "repository": "https://github.com/kotori-community/stats-plugin.git",
      "branch": "main",
      "enabled": false,
      "installPath": "~/.kotori-journal-data/plugins/git/community-stats",
      "installedAt": "2025-01-15T12:00:00Z"
    }
  },
  "settings": {
    "autoUpdate": true,
    "allowUnsignedPlugins": false,
    "maxPlugins": 20
  }
}
```

### 8.2 統合プラグインローダー

```typescript
class UnifiedPluginLoader {
  async loadPlugin(pluginName: string): Promise<Plugin> {
    const config = await this.getPluginConfig(pluginName)
    
    switch (config.type) {
      case 'npm':
        return import(config.installPath)
      case 'local':
        return this.loadLocalPlugin(config.installPath)
      case 'git':
        return this.loadGitPlugin(config.installPath)
    }
  }

  private async loadLocalPlugin(installPath: string): Promise<Plugin> {
    // キャッシュチェック
    const cacheKey = await this.getCacheKey(installPath)
    const cachedPath = path.join(this.dataPath, 'plugins', 'cache', 'local', `${cacheKey}.js`)
    
    if (await fs.pathExists(cachedPath)) {
      return import(cachedPath)
    }

    // TypeScript コンパイル & キャッシュ
    const compiledPath = await this.compileAndCache(installPath, cachedPath)
    return import(compiledPath)
  }

  private async compileAndCache(sourcePath: string, cachePath: string): Promise<string> {
    // TypeScript コンパイル
    const compiled = await this.compileTypeScript(sourcePath)
    
    // キャッシュに保存
    await fs.ensureDir(path.dirname(cachePath))
    await fs.writeFile(cachePath, compiled)
    
    return cachePath
  }
}
```

## 9. アップデート機能

### 9.1 プラグインアップデート管理

```typescript
class PluginUpdateManager {
  async updatePlugin(pluginName: string): Promise<void> {
    const config = await this.getPluginConfig(pluginName)
    
    switch (config.type) {
      case 'npm':
        await this.updateNpmPlugin(pluginName, config)
        break
      case 'git':
        await this.updateGitPlugin(pluginName, config)
        break
      case 'local':
        // ローカルプラグインは手動更新のみ
        console.log('Local plugins must be updated manually')
        break
    }
  }

  private async updateNpmPlugin(pluginName: string, config: PluginConfig): Promise<void> {
    const npmDir = path.join(this.dataPath, 'plugins', 'npm')
    await execAsync(`npm update ${config.package}`, { cwd: npmDir })
    
    // 設定更新
    await this.updatePluginVersion(pluginName)
  }

  private async updateGitPlugin(pluginName: string, config: PluginConfig): Promise<void> {
    const gitDir = config.installPath
    await execAsync('git pull origin ' + config.branch, { cwd: gitDir })
    await execAsync('npm install', { cwd: gitDir })
    
    if (await this.hasScript(gitDir, 'build')) {
      await execAsync('npm run build', { cwd: gitDir })
    }
  }
}
```

## 10. クリーンアップ機能

### 10.1 プラグイン削除

```typescript
class PluginCleanupManager {
  async uninstallPlugin(pluginName: string): Promise<void> {
    const config = await this.getPluginConfig(pluginName)
    
    // プラグインディレクトリ削除
    await fs.remove(config.installPath)
    
    // npmの場合は package.json からも削除
    if (config.type === 'npm') {
      await this.removeFromNpmPackageJson(config.package)
    }
    
    // キャッシュ削除
    await this.clearPluginCache(pluginName)
    
    // 設定から削除
    await this.removePluginConfig(pluginName)
  }

  async cleanupOrphanedPlugins(): Promise<void> {
    // 設定にないプラグインディレクトリを削除
    // 壊れたシンボリックリンクの削除
    // 古いキャッシュファイルの削除
  }
}
```

## 11. 実装段階

### Phase 1: コマンドシステム基盤
- CommandRegistry実装
- 既存AIトリガーのコマンド化
- 基本的なコマンドルーター

### Phase 2: プラグインローダー
- 動的import機能
- プラグイン設定管理
- セキュリティサンドボックス

### Phase 3: 標準プラグイン作成
- 統計表示プラグイン
- エクスポートプラグイン  
- 天気情報プラグイン

### Phase 4: エコシステム基盤
- プラグイン開発ガイド
- テンプレートパッケージ
- プラグイン開発者向けドキュメント

## 12. 使用例

### 12.1 プラグインインストール

```bash
# npmプラグイン
kotori plugin install @kotori/weather-plugin

# ローカルプラグイン
kotori plugin add ./my-plugin

# Gitプラグイン
kotori plugin install git+https://github.com/user/plugin.git
```

### 12.2 プラグイン使用

```bash
# 天気情報
> /weather 東京
今日の東京の天気: 晴れ、最高気温25℃

# 統計情報
> /stats 月間
2024年12月の統計:
- 総エントリー数: 45件
- 最も活発な曜日: 火曜日
- 主要カテゴリ: 仕事(60%), プライベート(40%)
```

この設計により、kotori-journalを柔軟で拡張可能なプラットフォームに進化させることができます。