import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CommandRegistry } from '../../src/services/command-registry'
import { Command, CommandContext, CommandResult } from '../../src/models/command'
import { Plugin } from '../../src/models/plugin'

// テスト用のモックコマンド
class TestCommand implements Command {
  name = 'test'
  triggers = ['test', 'testing']
  description = 'Test command'

  async execute(context: CommandContext): Promise<CommandResult> {
    return {
      type: 'display',
      content: `Test executed with input: ${context.input}`,
    }
  }
}

class RegexCommand implements Command {
  name = 'regex'
  triggers = [/^hello/, 'hi']
  description = 'Command with regex trigger'

  async execute(): Promise<CommandResult> {
    return {
      type: 'display',
      content: 'Regex command executed',
    }
  }
}

class ConditionalCommand implements Command {
  name = 'conditional'
  triggers = ['conditional']
  description = 'Command with execution condition'

  canExecute(context: CommandContext): boolean {
    return context.input.includes('allowed')
  }

  async execute(): Promise<CommandResult> {
    return {
      type: 'action',
      content: 'Conditional command executed',
    }
  }
}

class ErrorCommand implements Command {
  name = 'error'
  triggers = ['error']
  description = 'Command that throws error'

  async execute(): Promise<CommandResult> {
    throw new Error('Test error')
  }
}

// テスト用のモックプラグイン
const mockPlugin: Plugin = {
  name: 'test-plugin',
  version: '1.0.0',
  description: 'Test plugin',
  author: 'Test Author',
  commands: [new TestCommand()],
  async initialize() {
    // Mock initialization
  },
}

describe('CommandRegistry', () => {
  let registry: CommandRegistry
  let mockContext: CommandContext

  beforeEach(() => {
    registry = new CommandRegistry()
    mockContext = {
      input: '/test hello world',
      entries: [],
      services: {
        journal: {} as any,
        storage: {} as any,
        search: {} as any,
      },
      ui: {
        setMessage: vi.fn(),
        setEntries: vi.fn(),
        addEntry: vi.fn(),
      },
    }
  })

  describe('register/unregister', () => {
    it('should register a command', () => {
      const command = new TestCommand()
      registry.register(command)

      const commands = registry.getRegisteredCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toBe(command)
    })

    it('should unregister a command', () => {
      const command = new TestCommand()
      registry.register(command)
      registry.unregister('test')

      const commands = registry.getRegisteredCommands()
      expect(commands).toHaveLength(0)
    })

    it('should register plugin with commands', () => {
      registry.registerPlugin(mockPlugin)

      const commands = registry.getRegisteredCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0].name).toBe('test')

      const plugins = registry.getRegisteredPlugins()
      expect(plugins).toHaveLength(1)
      expect(plugins[0]).toBe(mockPlugin)
    })

    it('should unregister plugin and its commands', () => {
      registry.registerPlugin(mockPlugin)
      registry.unregisterPlugin('test-plugin')

      const commands = registry.getRegisteredCommands()
      expect(commands).toHaveLength(0)

      const plugins = registry.getRegisteredPlugins()
      expect(plugins).toHaveLength(0)
    })
  })

  describe('findCommand', () => {
    beforeEach(() => {
      registry.register(new TestCommand())
      registry.register(new RegexCommand())
    })

    it('should find command by exact name match', () => {
      const command = registry.findCommand('/test some args')
      expect(command).toBeTruthy()
      expect(command!.name).toBe('test')
    })

    it('should find command by trigger match', () => {
      const command = registry.findCommand('/testing some args')
      expect(command).toBeTruthy()
      expect(command!.name).toBe('test')
    })

    it('should find command by regex trigger', () => {
      const command = registry.findCommand('/hello world')
      expect(command).toBeTruthy()
      expect(command!.name).toBe('regex')
    })

    it('should find command by string trigger', () => {
      const command = registry.findCommand('/hi there')
      expect(command).toBeTruthy()
      expect(command!.name).toBe('regex')
    })

    it('should return null for non-command input', () => {
      const command = registry.findCommand('regular text')
      expect(command).toBeNull()
    })

    it('should return null for unknown command', () => {
      const command = registry.findCommand('/unknown')
      expect(command).toBeNull()
    })
  })

  describe('executeCommand', () => {
    it('should execute command successfully', async () => {
      const command = new TestCommand()
      const result = await registry.executeCommand(command, mockContext)

      expect(result.type).toBe('display')
      expect(result.content).toContain('/test hello world')
    })

    it('should check canExecute condition', async () => {
      const command = new ConditionalCommand()

      // Should fail without 'allowed' in input
      let result = await registry.executeCommand(command, mockContext)
      expect(result.type).toBe('error')
      expect(result.content).toContain('実行できません')

      // Should succeed with 'allowed' in input
      mockContext.input = '/conditional allowed'
      result = await registry.executeCommand(command, mockContext)
      expect(result.type).toBe('action')
      expect(result.content).toBe('Conditional command executed')
    })

    it('should handle command execution errors', async () => {
      const command = new ErrorCommand()
      const result = await registry.executeCommand(command, mockContext)

      expect(result.type).toBe('error')
      expect(result.content).toContain('実行に失敗しました')
      expect(result.content).toContain('Test error')
    })
  })

  describe('getCommandHelp', () => {
    it('should return help text for registered commands', () => {
      registry.register(new TestCommand())
      registry.register(new RegexCommand())

      const help = registry.getCommandHelp()
      expect(help).toContain('/test')
      expect(help).toContain('Test command')
      expect(help).toContain('/regex')
      expect(help).toContain('Command with regex trigger')
    })

    it('should return no commands message when empty', () => {
      const help = registry.getCommandHelp()
      expect(help).toBe('利用可能なコマンドはありません。')
    })
  })

  describe('integration scenarios', () => {
    it('should handle multiple commands with same trigger prefix', () => {
      const testCommand = new TestCommand()
      const regexCommand = new RegexCommand()

      registry.register(testCommand)
      registry.register(regexCommand)

      // Should match exact command name first
      const command = registry.findCommand('/test')
      expect(command).toBe(testCommand)
    })

    it('should handle plugin registration and command execution', async () => {
      registry.registerPlugin(mockPlugin)

      const command = registry.findCommand('/test hello')
      expect(command).toBeTruthy()

      const result = await registry.executeCommand(command!, {
        ...mockContext,
        input: '/test hello',
      })

      expect(result.type).toBe('display')
      expect(result.content).toContain('/test hello')
    })
  })
})
