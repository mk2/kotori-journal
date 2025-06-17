import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CommandRegistry } from '../../src/services/command-registry'
import {
  QuestionCommand,
  SummaryCommand,
  AdviceCommand,
  HelpCommand,
} from '../../src/commands/ai-commands'
import { Command, CommandContext, CommandResult } from '../../src/models/command'

describe('Basic Plugin System Integration', () => {
  let commandRegistry: CommandRegistry
  let mockContext: CommandContext

  beforeEach(() => {
    vi.clearAllMocks()
    commandRegistry = new CommandRegistry()

    // Mock context
    mockContext = {
      input: 'test command',
      entries: [],
      services: {
        journal: {
          isAIAvailable: () => true,
          addEntry: vi.fn().mockResolvedValue({ id: '1', content: 'test', category: 'test' }),
          getJournalEntriesByDate: () => [],
          generateAIResponse: vi.fn().mockResolvedValue('AI response'),
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
  })

  describe('Built-in Commands', () => {
    it('should register built-in AI commands', () => {
      commandRegistry.register(new QuestionCommand())
      commandRegistry.register(new SummaryCommand())
      commandRegistry.register(new AdviceCommand())
      commandRegistry.register(new HelpCommand())

      const commands = commandRegistry.getRegisteredCommands()
      expect(commands).toHaveLength(4)
      expect(commands.map(c => c.name)).toContain('question')
      expect(commands.map(c => c.name)).toContain('summary')
      expect(commands.map(c => c.name)).toContain('advice')
      expect(commands.map(c => c.name)).toContain('help')
    })

    it('should find commands by input', () => {
      commandRegistry.register(new QuestionCommand())
      commandRegistry.register(new HelpCommand())

      const questionCommand = commandRegistry.findCommand('/? test question')
      expect(questionCommand?.name).toBe('question')

      const helpCommand = commandRegistry.findCommand('/help')
      expect(helpCommand?.name).toBe('help')

      const noCommand = commandRegistry.findCommand('/unknown')
      expect(noCommand).toBeNull()
    })

    it('should execute help command successfully', async () => {
      const helpCommand = new HelpCommand()
      const result = await commandRegistry.executeCommand(helpCommand, mockContext)

      expect(result.type).toBe('display')
      expect(result.content).toContain('利用可能なコマンド')
    })
  })

  describe('Command Execution', () => {
    it('should handle command not found', () => {
      const command = commandRegistry.findCommand('/nonexistent')
      expect(command).toBeNull()
    })

    it('should handle canExecute check', async () => {
      const questionCommand = new QuestionCommand()

      // AI利用不可の場合
      const contextWithoutAI = {
        ...mockContext,
        services: {
          ...mockContext.services,
          journal: {
            ...mockContext.services.journal,
            isAIAvailable: () => false,
          },
        },
      }

      const result = await commandRegistry.executeCommand(questionCommand, contextWithoutAI)
      expect(result.type).toBe('error')
      expect(result.content).toBe('このコマンドは現在実行できません。')
    })
  })
})
