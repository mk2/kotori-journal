import { Command, CommandContext, CommandResult } from '../models/command'
import { Plugin } from '../models/plugin'

export class CommandRegistry {
  private commands: Map<string, Command> = new Map()
  private plugins: Map<string, Plugin> = new Map()

  register(command: Command): void {
    this.commands.set(command.name, command)
  }

  unregister(name: string): void {
    this.commands.delete(name)
  }

  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin)

    // プラグインのコマンドを登録
    if (plugin.commands) {
      for (const command of plugin.commands) {
        this.register(command)
      }
    }
  }

  unregisterPlugin(pluginName: string): void {
    const plugin = this.plugins.get(pluginName)
    if (plugin?.commands) {
      // プラグインのコマンドを削除
      for (const command of plugin.commands) {
        this.unregister(command.name)
      }
    }
    this.plugins.delete(pluginName)
  }

  findCommand(input: string): Command | null {
    // 入力テキストがスラッシュで始まる場合はコマンドとして処理
    if (!input.startsWith('/')) {
      return null
    }

    const commandText = input.slice(1).trim()
    const [commandName] = commandText.split(' ')

    // 直接コマンド名でマッチ
    const directMatch = this.commands.get(commandName)
    if (directMatch) {
      return directMatch
    }

    // トリガーでマッチ
    for (const command of this.commands.values()) {
      if (this.matchesTriggers(commandText, command.triggers)) {
        return command
      }
    }

    return null
  }

  private matchesTriggers(input: string, triggers: (string | RegExp)[]): boolean {
    for (const trigger of triggers) {
      if (trigger instanceof RegExp) {
        if (trigger.test(input)) {
          return true
        }
      } else {
        if (input.startsWith(trigger)) {
          return true
        }
      }
    }
    return false
  }

  async executeCommand(command: Command, context: CommandContext): Promise<CommandResult> {
    try {
      // canExecuteチェック
      if (command.canExecute && !command.canExecute(context)) {
        return {
          type: 'error',
          content: 'このコマンドは現在実行できません。',
        }
      }

      return await command.execute(context)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        type: 'error',
        content: `コマンドの実行に失敗しました: ${message}`,
      }
    }
  }

  getRegisteredCommands(): Command[] {
    return Array.from(this.commands.values())
  }

  getRegisteredPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  getCommandHelp(): string {
    const commands = this.getRegisteredCommands()
    if (commands.length === 0) {
      return '利用可能なコマンドはありません。'
    }

    const helpLines = commands.map(cmd => {
      const triggers = cmd.triggers.map((t: RegExp | string) => t.toString()).join(', ')
      return `/${cmd.name} (${triggers}) - ${cmd.description}`
    })

    return '利用可能なコマンド:\n' + helpLines.join('\n')
  }
}
