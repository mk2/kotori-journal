import { JournalEntry } from './journal'

export interface Command {
  name: string
  triggers: (string | RegExp)[]
  description: string
  execute(context: CommandContext): Promise<CommandResult>
  canExecute?(context: CommandContext): boolean
}

export interface CommandContext {
  input: string
  entries: JournalEntry[]
  services: PluginServices
  ui: UIContext
}

// Simplified services interface for plugins
export interface PluginServices {
  journal: {
    addEntry: (content: string, category?: string) => Promise<JournalEntry>
    getEntries: () => Promise<JournalEntry[]>
    searchEntries: (query: string) => Promise<JournalEntry[]>
  }
  storage: {
    read: (key: string) => Promise<string | null>
    write: (key: string, value: string) => Promise<void>
    delete: (key: string) => Promise<void>
  }
  search: {
    search: (query: string) => Promise<JournalEntry[]>
    searchByCategory: (category: string) => Promise<JournalEntry[]>
    searchByDate: (date: Date) => Promise<JournalEntry[]>
  }
}

export interface UIContext {
  setMessage: (message: string) => void
  setEntries: (entries: JournalEntry[]) => void
  addEntry: (entry: JournalEntry) => void
}

export interface CommandResult {
  type: 'display' | 'action' | 'error'
  content: string
  data?: unknown
}
