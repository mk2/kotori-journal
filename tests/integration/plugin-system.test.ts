import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CommandRegistry } from '../../src/services/command-registry'
import { PluginManager } from '../../src/services/plugin-manager'
import {
  QuestionCommand,
  SummaryCommand,
  AdviceCommand,
  HelpCommand,
} from '../../src/commands/ai-commands'
import { Plugin, PluginSource } from '../../src/models/plugin'
import { Command, CommandContext, CommandResult } from '../../src/models/command'
import { Config } from '../../src/utils/config'
import * as fs from 'fs/promises'
import { existsSync } from 'fs'

// モックfs
vi.mock('fs/promises')
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}))

const mockFs = vi.mocked(fs)
const mockExistsSync = vi.mocked(existsSync)

// テスト用のサンプルプラグイン
class WeatherCommand implements Command {
  name = 'weather'
  triggers = ['weather', '天気']
  description = '天気情報を表示'

  async execute(context: CommandContext): Promise<CommandResult> {
    const location = context.input.replace(/^\/weather\s*/, '') || '東京'
    return {
      type: 'display',
      content: `${location}の天気: 晴れ`,
    }
  }
}

const weatherPlugin: Plugin = {
  name: 'weather-plugin',
  version: '1.0.0',
  description: 'Weather information plugin',
  author: 'Test Author',
  commands: [new WeatherCommand()],
  async initialize() {
    // Mock initialization
  },
}

class StatsCommand implements Command {
  name = 'stats'
  triggers = ['stats', '統計']
  description = '統計情報を表示'

  async execute(context: CommandContext): Promise<CommandResult> {
    const totalEntries = context.entries.length
    return {
      type: 'display',
      content: `総エントリー数: ${totalEntries}件`,
    }
  }
}

const statsPlugin: Plugin = {
  name: 'stats-plugin',
  version: '2.0.0',
  description: 'Statistics plugin',
  author: 'Stats Author',
  commands: [new StatsCommand()],
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

describe('Plugin System Integration', () => {
  let commandRegistry: CommandRegistry
  let pluginManager: PluginManager
  let config: Config
  let mockContext: CommandContext

  beforeEach(() => {
    vi.clearAllMocks()

    config = {
      dataPath: '/test/data',
      defaultCategories: ['test'],
      aiTrigger: '@ai',
    }

    commandRegistry = new CommandRegistry()
    pluginManager = new PluginManager('/test/data', config, commandRegistry)

    mockContext = {
      input: '',
      entries: [
        { id: '1', content: 'Test entry 1', category: 'test', timestamp: new Date() },
        { id: '2', content: 'Test entry 2', category: 'test', timestamp: new Date() },
      ],
      services: {
        journal: {
          isAIAvailable: () => true,
          getJournalEntriesByDate: () => [],
          generateAIResponse: vi.fn().mockResolvedValue('AI response'),
          addEntry: vi
            .fn()
            .mockResolvedValue({
              id: '3',
              content: 'AI response',
              category: 'AI',
              timestamp: new Date(),
            }),
        } as any,
        storage: {} as any,
        search: {} as any,
      },
      ui: {
        setMessage: vi.fn(),
        setEntries: vi.fn(),
        addEntry: vi.fn(),
      },
    }

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

  describe('System initialization with built-in commands', () => {
    it('should register built-in AI commands', () => {
      commandRegistry.register(new QuestionCommand())
      commandRegistry.register(new SummaryCommand())
      commandRegistry.register(new AdviceCommand())
      commandRegistry.register(new HelpCommand())

      const commands = commandRegistry.getRegisteredCommands()
      expect(commands).toHaveLength(4)

      const commandNames = commands.map(cmd => cmd.name)
      expect(commandNames).toContain('question')
      expect(commandNames).toContain('summary')
      expect(commandNames).toContain('advice')
      expect(commandNames).toContain('help')
    })

    it('should find built-in commands correctly', () => {
      commandRegistry.register(new QuestionCommand())
      commandRegistry.register(new SummaryCommand())

      expect(commandRegistry.findCommand('/? test question')).toBeTruthy()
      expect(commandRegistry.findCommand('/question test')).toBeTruthy()
      expect(commandRegistry.findCommand('/summary')).toBeTruthy()
      expect(commandRegistry.findCommand('/要約')).toBeTruthy()
    })
  })

  describe('Plugin installation and registration', () => {
    it('should install and register plugin with commands', async () => {
      const source: PluginSource = {
        type: 'npm',
        identifier: 'weather-plugin',
        version: '1.0.0',
      }

      mockLoadPlugin.mockResolvedValue(weatherPlugin)

      await pluginManager.installPlugin(source, true)

      // Check plugin is registered
      const installedPlugins = pluginManager.getInstalledPlugins()
      expect(installedPlugins).toHaveLength(1)
      expect(installedPlugins[0].package).toBe('weather-plugin')

      // Check plugin is enabled
      expect(pluginManager.isPluginEnabled('weather-plugin')).toBe(true)

      // Check commands are registered
      const commands = commandRegistry.getRegisteredCommands()
      expect(commands.some(cmd => cmd.name === 'weather')).toBe(true)
    })

    it('should handle multiple plugins with different commands', async () => {
      // Install weather plugin
      mockLoadPlugin.mockResolvedValueOnce(weatherPlugin)
      await pluginManager.installPlugin(
        {
          type: 'npm',
          identifier: 'weather-plugin',
        },
        true
      )

      // Install stats plugin
      mockLoadPlugin.mockResolvedValueOnce(statsPlugin)
      await pluginManager.installPlugin(
        {
          type: 'local',
          identifier: 'stats-plugin',
          path: '/test/stats',
        },
        true
      )

      const commands = commandRegistry.getRegisteredCommands()
      expect(commands.some(cmd => cmd.name === 'weather')).toBe(true)
      expect(commands.some(cmd => cmd.name === 'stats')).toBe(true)

      const enabledPlugins = pluginManager.getEnabledPlugins()
      expect(enabledPlugins).toHaveLength(2)
    })
  })

  describe('Command execution workflow', () => {
    beforeEach(async () => {
      // Register built-in commands
      commandRegistry.register(new QuestionCommand())
      commandRegistry.register(new SummaryCommand())

      // Install and register weather plugin
      mockLoadPlugin.mockResolvedValue(weatherPlugin)
      await pluginManager.installPlugin(
        {
          type: 'npm',
          identifier: 'weather-plugin',
        },
        true
      )
    })

    it('should execute built-in AI commands', async () => {
      const command = commandRegistry.findCommand('/? test question')
      expect(command).toBeTruthy()

      const result = await commandRegistry.executeCommand(command!, {
        ...mockContext,
        input: '/? test question',
      })

      expect(result.type).toBe('action')
      expect(result.content).toBe('AI応答を生成しました')
    })

    it('should execute plugin commands', async () => {
      const command = commandRegistry.findCommand('/weather 東京')
      expect(command).toBeTruthy()
      expect(command!.name).toBe('weather')

      const result = await commandRegistry.executeCommand(command!, {
        ...mockContext,
        input: '/weather 東京',
      })

      expect(result.type).toBe('display')
      expect(result.content).toContain('東京の天気')
    })

    it('should handle command not found', () => {
      const command = commandRegistry.findCommand('/unknown command')
      expect(command).toBeNull()
    })

    it('should handle mixed built-in and plugin commands', async () => {
      // Test built-in command
      let command = commandRegistry.findCommand('/summary')
      expect(command!.name).toBe('summary')

      // Test plugin command
      command = commandRegistry.findCommand('/weather')
      expect(command!.name).toBe('weather')

      // Both should be available
      const commands = commandRegistry.getRegisteredCommands()
      expect(commands.some(cmd => cmd.name === 'summary')).toBe(true)
      expect(commands.some(cmd => cmd.name === 'weather')).toBe(true)
    })
  })

  describe('Plugin lifecycle management', () => {
    beforeEach(async () => {
      mockLoadPlugin.mockResolvedValue(weatherPlugin)
      await pluginManager.installPlugin(
        {
          type: 'npm',
          identifier: 'weather-plugin',
        },
        true
      )
    })

    it('should disable plugin and remove commands', async () => {
      // Verify command is available
      expect(commandRegistry.findCommand('/weather')).toBeTruthy()

      // Disable plugin
      await pluginManager.disablePlugin('weather-plugin')

      // Check plugin is disabled
      expect(pluginManager.isPluginEnabled('weather-plugin')).toBe(false)

      // Check commands are removed
      expect(commandRegistry.findCommand('/weather')).toBeNull()
    })

    it('should re-enable plugin and restore commands', async () => {
      // Disable plugin
      await pluginManager.disablePlugin('weather-plugin')
      expect(commandRegistry.findCommand('/weather')).toBeNull()

      // Re-enable plugin
      await pluginManager.enablePlugin('weather-plugin')

      // Check plugin is enabled
      expect(pluginManager.isPluginEnabled('weather-plugin')).toBe(true)

      // Check commands are restored
      expect(commandRegistry.findCommand('/weather')).toBeTruthy()
    })

    it('should uninstall plugin completely', async () => {
      // Verify plugin exists
      expect(pluginManager.getInstalledPlugins()).toHaveLength(1)
      expect(commandRegistry.findCommand('/weather')).toBeTruthy()

      // Uninstall plugin
      mockExistsSync.mockReturnValue(true)
      await pluginManager.uninstallPlugin('weather-plugin')

      // Check plugin is completely removed
      expect(pluginManager.getInstalledPlugins()).toHaveLength(0)
      expect(pluginManager.isPluginEnabled('weather-plugin')).toBe(false)
      expect(commandRegistry.findCommand('/weather')).toBeNull()
    })
  })

  describe('Command trigger precedence', () => {
    beforeEach(async () => {
      // Register built-in help command
      commandRegistry.register(new HelpCommand())

      // Install stats plugin that also has similar triggers
      mockLoadPlugin.mockResolvedValue(statsPlugin)
      await pluginManager.installPlugin(
        {
          type: 'local',
          identifier: 'stats-plugin',
        },
        true
      )
    })

    it('should handle command name conflicts correctly', async () => {
      // Both help and stats might have similar triggers
      const helpCommand = commandRegistry.findCommand('/help')
      const statsCommand = commandRegistry.findCommand('/stats')

      expect(helpCommand).toBeTruthy()
      expect(statsCommand).toBeTruthy()
      expect(helpCommand!.name).toBe('help')
      expect(statsCommand!.name).toBe('stats')
    })

    it('should execute correct command based on exact trigger match', async () => {
      const statsCommand = commandRegistry.findCommand('/stats')
      const result = await commandRegistry.executeCommand(statsCommand!, mockContext)

      expect(result.type).toBe('display')
      expect(result.content).toContain('総エントリー数: 2件')
    })
  })

  describe('Error handling and recovery', () => {
    it('should handle plugin loading failures gracefully', async () => {
      mockLoadPlugin.mockRejectedValue(new Error('Plugin load failed'))

      await expect(
        pluginManager.installPlugin({
          type: 'npm',
          identifier: 'broken-plugin',
        })
      ).rejects.toThrow('Failed to install plugin')

      // System should remain stable
      expect(commandRegistry.getRegisteredCommands()).toHaveLength(0)
      expect(pluginManager.getInstalledPlugins()).toHaveLength(0)
    })

    it('should handle command execution errors gracefully', async () => {
      const errorCommand: Command = {
        name: 'error',
        triggers: ['error'],
        description: 'Error command',
        async execute() {
          throw new Error('Command failed')
        },
      }

      commandRegistry.register(errorCommand)

      const result = await commandRegistry.executeCommand(errorCommand, mockContext)
      expect(result.type).toBe('error')
      expect(result.content).toContain('実行に失敗しました')
    })

    it('should maintain system stability when plugin throws during initialization', async () => {
      const faultyPlugin: Plugin = {
        ...weatherPlugin,
        name: 'faulty-plugin',
        async initialize() {
          throw new Error('Initialization failed')
        },
      }

      mockLoadPlugin.mockResolvedValue(faultyPlugin)

      await expect(
        pluginManager.installPlugin(
          {
            type: 'npm',
            identifier: 'faulty-plugin',
          },
          true
        )
      ).rejects.toThrow('Failed to enable plugin')

      // Plugin should be installed but not enabled
      expect(pluginManager.getInstalledPlugins()).toHaveLength(1)
      expect(pluginManager.isPluginEnabled('faulty-plugin')).toBe(false)
    })
  })

  describe('Full system integration scenario', () => {
    it('should handle complete workflow from installation to command execution', async () => {
      // Start with built-in commands
      commandRegistry.register(new QuestionCommand())
      commandRegistry.register(new HelpCommand())

      // Install multiple plugins
      mockLoadPlugin.mockResolvedValueOnce(weatherPlugin).mockResolvedValueOnce(statsPlugin)

      await pluginManager.installPlugin({ type: 'npm', identifier: 'weather-plugin' }, true)
      await pluginManager.installPlugin(
        { type: 'local', identifier: 'stats-plugin', path: '/test' },
        true
      )

      // Verify all commands are available
      const allCommands = commandRegistry.getRegisteredCommands()
      expect(allCommands).toHaveLength(4) // question, help, weather, stats

      // Test execution of each type
      const questionResult = await commandRegistry.executeCommand(
        commandRegistry.findCommand('/? test')!,
        { ...mockContext, input: '/? test' }
      )
      expect(questionResult.type).toBe('action')

      const weatherResult = await commandRegistry.executeCommand(
        commandRegistry.findCommand('/weather')!,
        { ...mockContext, input: '/weather' }
      )
      expect(weatherResult.type).toBe('display')

      const statsResult = await commandRegistry.executeCommand(
        commandRegistry.findCommand('/stats')!,
        mockContext
      )
      expect(statsResult.type).toBe('display')

      // Test help command shows all available commands
      const helpResult = await commandRegistry.executeCommand(
        commandRegistry.findCommand('/help')!,
        mockContext
      )
      expect(helpResult.content).toContain('/? または /question')
      expect(helpResult.content).toContain('/help')
    })
  })
})
