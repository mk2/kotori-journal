import React, { useState, useEffect } from 'react'
import { JournalService } from '../services/journal-service'
import { SearchService } from '../services/search-service'
import { CommandRegistry } from '../services/command-registry'
import { PluginManager } from '../services/plugin-manager'
import { JournalEntry } from '../models/journal'
import { Config } from '../utils/config'
import {
  QuestionCommand,
  SummaryCommand,
  AdviceCommand,
  HelpCommand,
} from '../commands/ai-commands'

interface UseJournalServiceReturn {
  journalService: JournalService | null
  searchService: SearchService | null
  commandRegistry: CommandRegistry | null
  entries: JournalEntry[]
  categories: string[]
  isReady: boolean
  setEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>
  setCategories: React.Dispatch<React.SetStateAction<string[]>>
}

export const useJournalService = (config: Config): UseJournalServiceReturn => {
  const [journalService, setJournalService] = useState<JournalService | null>(null)
  const [searchService, setSearchService] = useState<SearchService | null>(null)
  const [commandRegistry, setCommandRegistry] = useState<CommandRegistry | null>(null)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const initService = async () => {
      const service = new JournalService(config.dataPath)
      await service.initialize()

      const registry = new CommandRegistry()
      const manager = new PluginManager(config.dataPath, config, registry)

      registry.register(new QuestionCommand())
      registry.register(new SummaryCommand())
      registry.register(new AdviceCommand())
      registry.register(new HelpCommand())

      await manager.initialize()

      setJournalService(service)
      setSearchService(new SearchService(service))
      setCommandRegistry(registry)
      setEntries(service.getEntries())
      setCategories(service.getCategories())
      setIsReady(true)
    }

    initService().catch(error => {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize service:', error)
    })
  }, [config])

  return {
    journalService,
    searchService,
    commandRegistry,
    entries,
    categories,
    isReady,
    setEntries,
    setCategories,
  }
}
