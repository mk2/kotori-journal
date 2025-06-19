import { Plugin, PluginContext } from './plugin'
import { Command, CommandContext, CommandResult } from './command'

/**
 * Helper function to create a plugin with type safety
 */
export function createPlugin(definition: Plugin): Plugin {
  return definition
}

/**
 * Helper function to create a command with type safety
 */
export function createCommand(definition: Command): Command {
  return definition
}

/**
 * Helper function to create a simple text command
 */
export function createTextCommand(
  name: string,
  triggers: (string | RegExp)[],
  description: string,
  handler: (context: CommandContext) => Promise<string> | string
): Command {
  return {
    name,
    triggers,
    description,
    async execute(context: CommandContext): Promise<CommandResult> {
      try {
        const result = await handler(context)
        return {
          type: 'display',
          content: result,
        }
      } catch (error) {
        return {
          type: 'error',
          content: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },
  }
}

/**
 * Helper function to create a simple plugin with minimal setup
 */
export function createSimplePlugin(
  name: string,
  version: string,
  description: string,
  author: string,
  commands: Command[]
): Plugin {
  return {
    name,
    version,
    description,
    author,
    commands,
    async initialize(context: PluginContext): Promise<void> {
      context.logger.info(`Plugin ${name} initialized`)
    },
  }
}
