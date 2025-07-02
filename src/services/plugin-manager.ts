import * as path from 'path'
import * as fs from 'fs/promises'
import { existsSync } from 'fs'
import { Plugin, PluginConfig, PluginSource, PluginContext } from '../models/plugin'
import { PluginSourceManager } from './plugin-source-manager'
import { CommandRegistry } from './command-registry'
import { Config } from '../utils/config'
import { ensureDirectoryExists } from '../utils/directory.js'

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map()
  private pluginConfigs: Map<string, PluginConfig> = new Map()
  private sourceManager: PluginSourceManager
  private commandRegistry: CommandRegistry

  constructor(
    private dataPath: string,
    private config: Config,
    commandRegistry: CommandRegistry
  ) {
    this.sourceManager = new PluginSourceManager(dataPath)
    this.commandRegistry = commandRegistry
  }

  async initialize(): Promise<void> {
    await this.loadPluginConfigs()
    await this.loadEnabledPlugins()
  }

  async installPlugin(source: PluginSource, enabled: boolean = true): Promise<void> {
    try {
      const plugin = await this.sourceManager.loadPlugin(source)

      // プラグイン設定を作成
      const config: PluginConfig = {
        type: source.type,
        package: source.identifier,
        version: source.version,
        enabled,
        installPath: this.getInstallPath(source, plugin.name),
        installedAt: new Date().toISOString(),
        sourcePath: source.path,
        repository: source.repository,
        branch: source.branch,
      }

      // プラグイン設定を保存
      this.pluginConfigs.set(plugin.name, config)
      await this.savePluginConfigs()

      if (enabled) {
        await this.enablePlugin(plugin.name)
      }
    } catch (error) {
      throw new Error(`Failed to install plugin: ${error}`)
    }
  }

  async enablePlugin(pluginName: string): Promise<void> {
    const config = this.pluginConfigs.get(pluginName)
    if (!config) {
      throw new Error(`Plugin configuration not found: ${pluginName}`)
    }

    if (this.plugins.has(pluginName)) {
      return // Already enabled
    }

    try {
      const source: PluginSource = {
        type: config.type,
        identifier: config.package || pluginName,
        version: config.version,
        path: config.sourcePath,
        repository: config.repository,
        branch: config.branch,
      }

      const plugin = await this.sourceManager.loadPlugin(source)

      // プラグインコンテキストを作成
      const context = this.createPluginContext(plugin)

      // プラグインを初期化
      await plugin.initialize(context)

      // プラグインを登録
      this.plugins.set(pluginName, plugin)
      this.commandRegistry.registerPlugin(plugin)

      // 設定を更新
      config.enabled = true
      await this.savePluginConfigs()
    } catch (error) {
      throw new Error(`Failed to enable plugin ${pluginName}: ${error}`)
    }
  }

  async disablePlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName)
    if (!plugin) {
      return // Already disabled
    }

    try {
      // プラグインを破棄
      if (plugin.dispose) {
        await plugin.dispose()
      }

      // レジストリから削除
      this.commandRegistry.unregisterPlugin(pluginName)
      this.plugins.delete(pluginName)

      // 設定を更新
      const config = this.pluginConfigs.get(pluginName)
      if (config) {
        config.enabled = false
        await this.savePluginConfigs()
      }
    } catch (error) {
      throw new Error(`Failed to disable plugin ${pluginName}: ${error}`)
    }
  }

  async uninstallPlugin(pluginName: string): Promise<void> {
    // まず無効化
    await this.disablePlugin(pluginName)

    const config = this.pluginConfigs.get(pluginName)
    if (config) {
      // インストールパスが存在すれば削除
      if (existsSync(config.installPath)) {
        await fs.rm(config.installPath, { recursive: true, force: true })
      }

      // 設定から削除
      this.pluginConfigs.delete(pluginName)
      await this.savePluginConfigs()
    }
  }

  getInstalledPlugins(): PluginConfig[] {
    return Array.from(this.pluginConfigs.values())
  }

  getEnabledPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  isPluginEnabled(pluginName: string): boolean {
    return this.plugins.has(pluginName)
  }

  private async loadPluginConfigs(): Promise<void> {
    const configPath = this.getPluginConfigPath()

    if (existsSync(configPath)) {
      try {
        const configContent = await fs.readFile(configPath, 'utf-8')
        const data = JSON.parse(configContent)

        if (data.plugins) {
          for (const [name, config] of Object.entries(data.plugins)) {
            this.pluginConfigs.set(name, config as PluginConfig)
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load plugin configs:', error)
      }
    }
  }

  private async savePluginConfigs(): Promise<void> {
    const configPath = this.getPluginConfigPath()
    const configDir = path.dirname(configPath)

    await ensureDirectoryExists(configDir)

    const data = {
      plugins: Object.fromEntries(this.pluginConfigs),
      settings: {
        autoUpdate: true,
        allowUnsignedPlugins: false,
        maxPlugins: 20,
      },
    }

    await fs.writeFile(configPath, JSON.stringify(data, null, 2))
  }

  private async loadEnabledPlugins(): Promise<void> {
    for (const [name, config] of this.pluginConfigs) {
      if (config.enabled) {
        try {
          await this.enablePlugin(name)
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to load plugin ${name}:`, error)
        }
      }
    }
  }

  private createPluginContext(plugin: Plugin): PluginContext {
    return {
      config: this.config,
      dataPath: path.join(this.dataPath, 'plugins', plugin.name),
      storage: this.createRestrictedStorage(plugin.name),
      network: this.createRestrictedNetwork(),
      logger: this.createLogger(plugin.name),
    }
  }

  private createRestrictedStorage(pluginName: string) {
    const pluginDataPath = path.join(this.dataPath, 'plugins', pluginName, 'data')

    return {
      async read(key: string): Promise<string | null> {
        const filePath = path.join(pluginDataPath, `${key}.json`)
        if (existsSync(filePath)) {
          return fs.readFile(filePath, 'utf-8')
        }
        return null
      },

      async write(key: string, value: string): Promise<void> {
        await ensureDirectoryExists(pluginDataPath)
        const filePath = path.join(pluginDataPath, `${key}.json`)
        await fs.writeFile(filePath, value, 'utf-8')
      },

      async delete(key: string): Promise<void> {
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
    return {
      async fetch(url: string, options?: Record<string, unknown>): Promise<unknown> {
        // 基本的なURL検証
        const urlObj = new globalThis.URL(url)
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          throw new Error('Only HTTP and HTTPS protocols are allowed')
        }

        return globalThis.fetch(url, options as Parameters<typeof globalThis.fetch>[1])
      },
    }
  }

  private createLogger(pluginName: string) {
    return {
      info: (message: string, ...args: unknown[]) => {
        // eslint-disable-next-line no-console
        console.log(`[${pluginName}] ${message}`, ...args)
      },
      warn: (message: string, ...args: unknown[]) => {
        // eslint-disable-next-line no-console
        console.warn(`[${pluginName}] ${message}`, ...args)
      },
      error: (message: string, ...args: unknown[]) => {
        // eslint-disable-next-line no-console
        console.error(`[${pluginName}] ${message}`, ...args)
      },
      debug: (message: string, ...args: unknown[]) => {
        // eslint-disable-next-line no-console
        console.debug(`[${pluginName}] ${message}`, ...args)
      },
    }
  }

  private getInstallPath(source: PluginSource, pluginName: string): string {
    switch (source.type) {
      case 'npm':
        return path.join(this.dataPath, 'plugins', 'npm', 'node_modules', source.identifier)
      case 'local':
        return path.join(this.dataPath, 'plugins', 'local', pluginName)
      case 'git':
        return path.join(this.dataPath, 'plugins', 'git', pluginName)
      default:
        throw new Error(`Unknown plugin source type: ${source.type}`)
    }
  }

  private getPluginConfigPath(): string {
    return path.join(this.dataPath, 'plugins.json')
  }
}
