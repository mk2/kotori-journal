import { JournalEntry } from './journal'
import { JournalService } from '../services/journal-service'
import { StorageService } from '../services/storage'
import { SearchService } from '../services/search-service'

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
  services: {
    journal: JournalService
    storage: StorageService
    search: SearchService
  }
  ui: UIContext
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
