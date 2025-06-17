import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { PluginManager } from '../../src/services/plugin-manager'
import { CommandRegistry } from '../../src/services/command-registry'
import { Plugin, PluginSource } from '../../src/models/plugin'
import { Config } from '../../src/utils/config'
import * as fs from 'fs/promises'
import { existsSync } from 'fs'
import * as path from 'path'

// モックfs
vi.mock('fs/promises')
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}))

const mockFs = vi.mocked(fs)
const mockExistsSync = vi.mocked(existsSync)

// テスト用のモックプラグイン
const mockPlugin: Plugin = {
  name: 'test-plugin',
  version: '1.0.0',
  description: 'Test plugin',
  author: 'Test Author',
  commands: [],
  async initialize() {
    // Mock initialization
  },
}

// モックPluginSourceManager
const mockLoadPlugin = vi.fn()

vi.mock('../../src/services/plugin-source-manager', () => ({
  PluginSourceManager: vi.fn().mockImplementation(() => ({
    loadPlugin: mockLoadPlugin,
  })),
}))

describe('PluginManager', () => {
  let pluginManager: PluginManager
  let commandRegistry: CommandRegistry
  let config: Config
  const testDataPath = '/test/data'

  beforeEach(() => {
    vi.clearAllMocks()

    commandRegistry = new CommandRegistry()
    config = {
      dataPath: testDataPath,
      defaultCategories: ['test'],
      aiTrigger: '@ai',
    }

    pluginManager = new PluginManager(testDataPath, config, commandRegistry)

    // デフォルトのモック設定
    mockExistsSync.mockReturnValue(false)
    mockFs.readFile.mockResolvedValue('{}')
    mockFs.writeFile.mockResolvedValue()
    mockFs.mkdir.mockResolvedValue(undefined)
    mockFs.readdir.mockResolvedValue([])
    mockFs.rm.mockResolvedValue()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('initialization', () => {
    it('should initialize successfully with no existing config', async () => {
      await expect(pluginManager.initialize()).resolves.not.toThrow()
    })

    it('should load existing plugin configs', async () => {
      const configData = JSON.stringify({
        plugins: {
          'test-plugin': {
            type: 'npm',
            package: 'test-plugin',
            version: '1.0.0',
            enabled: false,
            installPath: '/test/path',
            installedAt: '2023-01-01T00:00:00Z',
          },
        },
      })

      mockExistsSync.mockReturnValue(true)
      mockFs.readFile.mockResolvedValue(configData)

      await pluginManager.initialize()

      const installedPlugins = pluginManager.getInstalledPlugins()
      expect(installedPlugins).toHaveLength(1)
      expect(installedPlugins[0].package).toBe('test-plugin')
    })

    it('should handle config loading errors gracefully', async () => {
      mockExistsSync.mockReturnValue(true)
      mockFs.readFile.mockRejectedValue(new Error('Read error'))

      // Should not throw
      await expect(pluginManager.initialize()).resolves.not.toThrow()
    })
  })

  describe('installPlugin', () => {
    it('should install npm plugin successfully', async () => {
      const source: PluginSource = {
        type: 'npm',
        identifier: 'test-plugin',
        version: '1.0.0',
      }

      mockLoadPlugin.mockResolvedValue(mockPlugin)

      await pluginManager.installPlugin(source, false)

      const installedPlugins = pluginManager.getInstalledPlugins()
      expect(installedPlugins).toHaveLength(1)
      expect(installedPlugins[0].type).toBe('npm')
      expect(installedPlugins[0].enabled).toBe(false)
    })

    it('should install and enable plugin when enabled=true', async () => {
      const source: PluginSource = {
        type: 'local',
        identifier: 'local-plugin',
        path: '/test/local/plugin',
      }

      mockLoadPlugin.mockResolvedValue(mockPlugin)

      await pluginManager.installPlugin(source, true)

      const enabledPlugins = pluginManager.getEnabledPlugins()
      expect(enabledPlugins).toHaveLength(1)
      expect(pluginManager.isPluginEnabled('test-plugin')).toBe(true)
    })

    it('should handle plugin installation errors', async () => {
      const source: PluginSource = {
        type: 'npm',
        identifier: 'bad-plugin',
      }

      mockLoadPlugin.mockRejectedValue(new Error('Load error'))

      await expect(pluginManager.installPlugin(source)).rejects.toThrow('Failed to install plugin')
    })
  })

  describe('enablePlugin', () => {
    beforeEach(async () => {
      const source: PluginSource = {
        type: 'npm',
        identifier: 'test-plugin',
        version: '1.0.0',
      }
      mockLoadPlugin.mockResolvedValue(mockPlugin)
      await pluginManager.installPlugin(source, false)
    })

    it('should enable disabled plugin', async () => {
      await pluginManager.enablePlugin('test-plugin')

      expect(pluginManager.isPluginEnabled('test-plugin')).toBe(true)
      expect(mockPlugin.initialize).toHaveBeenCalled()
    })

    it('should not fail when enabling already enabled plugin', async () => {
      await pluginManager.enablePlugin('test-plugin')
      await expect(pluginManager.enablePlugin('test-plugin')).resolves.not.toThrow()
    })

    it('should handle plugin loading errors', async () => {
      mockLoadPlugin.mockRejectedValue(new Error('Load error'))

      await expect(pluginManager.enablePlugin('test-plugin')).rejects.toThrow(
        'Failed to enable plugin'
      )
    })

    it('should throw error for unknown plugin', async () => {
      await expect(pluginManager.enablePlugin('unknown-plugin')).rejects.toThrow(
        'Plugin configuration not found'
      )
    })
  })

  describe('disablePlugin', () => {
    beforeEach(async () => {
      const source: PluginSource = {
        type: 'npm',
        identifier: 'test-plugin',
        version: '1.0.0',
      }
      mockLoadPlugin.mockResolvedValue(mockPlugin)
      await pluginManager.installPlugin(source, true)
    })

    it('should disable enabled plugin', async () => {
      await pluginManager.disablePlugin('test-plugin')

      expect(pluginManager.isPluginEnabled('test-plugin')).toBe(false)
    })

    it('should call plugin dispose method if available', async () => {
      const disposableMockPlugin = {
        ...mockPlugin,
        dispose: vi.fn().mockResolvedValue(undefined),
      }

      mockLoadPlugin.mockResolvedValue(disposableMockPlugin)
      await pluginManager.enablePlugin('test-plugin')

      await pluginManager.disablePlugin('test-plugin')

      expect(disposableMockPlugin.dispose).toHaveBeenCalled()
    })

    it('should not fail when disabling already disabled plugin', async () => {
      await pluginManager.disablePlugin('test-plugin')
      await expect(pluginManager.disablePlugin('test-plugin')).resolves.not.toThrow()
    })
  })

  describe('uninstallPlugin', () => {
    beforeEach(async () => {
      const source: PluginSource = {
        type: 'npm',
        identifier: 'test-plugin',
        version: '1.0.0',
      }
      mockLoadPlugin.mockResolvedValue(mockPlugin)
      await pluginManager.installPlugin(source, true)
    })

    it('should uninstall plugin completely', async () => {
      mockExistsSync.mockReturnValue(true)

      await pluginManager.uninstallPlugin('test-plugin')

      expect(pluginManager.isPluginEnabled('test-plugin')).toBe(false)
      expect(pluginManager.getInstalledPlugins()).toHaveLength(0)
      expect(mockFs.rm).toHaveBeenCalled()
    })

    it('should handle missing install path gracefully', async () => {
      mockExistsSync.mockReturnValue(false)

      await expect(pluginManager.uninstallPlugin('test-plugin')).resolves.not.toThrow()
    })
  })

  describe('storage and network restrictions', () => {
    let restrictedStorage: any
    let restrictedNetwork: any

    beforeEach(() => {
      const manager = pluginManager as any
      restrictedStorage = manager.createRestrictedStorage('test-plugin')
      restrictedNetwork = manager.createRestrictedNetwork()
    })

    describe('restricted storage', () => {
      it('should validate storage keys', async () => {
        await expect(restrictedStorage.write('valid_key-123', 'data')).resolves.not.toThrow()
        await expect(restrictedStorage.write('invalid/key', 'data')).rejects.toThrow(
          'Invalid storage key'
        )
        await expect(restrictedStorage.write('../traversal', 'data')).rejects.toThrow(
          'Invalid storage key'
        )
      })

      it('should limit storage value size', async () => {
        const largeValue = 'x'.repeat(1024 * 1024 + 1) // 1MB + 1 byte
        await expect(restrictedStorage.write('key', largeValue)).rejects.toThrow(
          'Storage value too large'
        )
      })

      it('should handle file operations correctly', async () => {
        mockExistsSync.mockReturnValue(false)

        const result = await restrictedStorage.read('nonexistent')
        expect(result).toBeNull()

        await restrictedStorage.write('test', 'data')
        expect(mockFs.mkdir).toHaveBeenCalled()
        expect(mockFs.writeFile).toHaveBeenCalled()
      })
    })

    describe('restricted network', () => {
      it('should reject non-HTTP protocols', async () => {
        await expect(restrictedNetwork.fetch('ftp://example.com')).rejects.toThrow(
          'Only HTTP and HTTPS protocols are allowed'
        )
        await expect(restrictedNetwork.fetch('file:///etc/passwd')).rejects.toThrow(
          'Only HTTP and HTTPS protocols are allowed'
        )
      })

      it('should allow HTTP and HTTPS', async () => {
        // Mock globalThis.fetch
        const mockFetch = vi.fn().mockResolvedValue({ ok: true })
        global.fetch = mockFetch
        global.URL = URL

        await restrictedNetwork.fetch('https://example.com')
        expect(mockFetch).toHaveBeenCalled()
      })
    })
  })

  describe('plugin configuration persistence', () => {
    it('should save plugin configurations to file', async () => {
      const source: PluginSource = {
        type: 'npm',
        identifier: 'test-plugin',
        version: '1.0.0',
      }

      mockLoadPlugin.mockResolvedValue(mockPlugin)
      await pluginManager.installPlugin(source)

      expect(mockFs.writeFile).toHaveBeenCalled()
      const writeCall = mockFs.writeFile.mock.calls.find(call =>
        call[0].toString().includes('plugins.json')
      )
      expect(writeCall).toBeTruthy()

      const configData = JSON.parse(writeCall![1] as string)
      expect(configData.plugins['test-plugin']).toBeDefined()
      expect(configData.settings).toBeDefined()
    })

    it('should create directory if it does not exist', async () => {
      mockExistsSync.mockReturnValue(false)

      const source: PluginSource = {
        type: 'npm',
        identifier: 'test-plugin',
      }

      mockLoadPlugin.mockResolvedValue(mockPlugin)
      await pluginManager.installPlugin(source)

      expect(mockFs.mkdir).toHaveBeenCalledWith(expect.stringContaining('plugins'), {
        recursive: true,
      })
    })
  })

  describe('plugin context creation', () => {
    it('should create proper plugin context', async () => {
      const source: PluginSource = {
        type: 'npm',
        identifier: 'test-plugin',
      }

      let capturedContext: any
      const contextCaptureMockPlugin = {
        ...mockPlugin,
        initialize: vi.fn().mockImplementation(context => {
          capturedContext = context
        }),
      }

      mockLoadPlugin.mockResolvedValue(contextCaptureMockPlugin)
      await pluginManager.installPlugin(source, true)

      expect(capturedContext).toBeDefined()
      expect(capturedContext.config).toBe(config)
      expect(capturedContext.dataPath).toContain('test-plugin')
      expect(capturedContext.storage).toBeDefined()
      expect(capturedContext.network).toBeDefined()
      expect(capturedContext.logger).toBeDefined()
    })
  })
})
