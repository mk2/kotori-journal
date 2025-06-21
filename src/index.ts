// Kotori Journal - Library exports
export { JournalService } from './services/journal-service.js'
export { CategoryStorage } from './services/category-storage.js'
export { SearchService } from './services/search-service.js'
export { StorageService } from './services/storage.js'
export { CommandRegistry } from './services/command-registry.js'
export { PluginManager } from './services/plugin-manager.js'
export { ClaudeAIService } from './services/claude-ai.js'
export { DailyReportService } from './services/daily-report.js'

// Models
export type { JournalEntry } from './models/journal.js'
export { CategoryManager } from './models/category.js'
export type { Command, CommandContext } from './models/command.js'
export type { Plugin } from './models/plugin.js'

// Utils
export { getConfig } from './utils/config.js'
export type { Config } from './utils/config.js'

// For convenience, users can also import the main services directly
// Example: import { JournalService, StorageService, ClaudeAIService } from 'kotori-journal'
