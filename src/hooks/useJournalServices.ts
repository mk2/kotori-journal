import { useState, useEffect, useCallback } from 'react'
import { JournalService } from '../services/journal-service'
import { SearchService } from '../services/search-service'
import { CommandRegistry } from '../services/command-registry'
import { PluginManager } from '../services/plugin-manager'
import {
  QuestionCommand,
  SummaryCommand,
  AdviceCommand,
  HelpCommand,
} from '../commands/ai-commands'
import { Config } from '../utils/config'

interface UseJournalServicesResult {
  isReady: boolean
  journalService: JournalService | null
  searchService: SearchService | null
  commandRegistry: CommandRegistry | null
  pluginManager: PluginManager | null
  categories: string[]
  lastUpdateTime: number
  refreshCategories: () => void
}

export const useJournalServices = (config: Config): UseJournalServicesResult => {
  const [isReady, setIsReady] = useState(false)
  const [journalService, setJournalService] = useState<JournalService | null>(null)
  const [searchService, setSearchService] = useState<SearchService | null>(null)
  const [commandRegistry, setCommandRegistry] = useState<CommandRegistry | null>(null)
  const [pluginManager, setPluginManager] = useState<PluginManager | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)

  const refreshCategories = useCallback(() => {
    if (journalService) {
      setCategories(journalService.getCategories())
    }
  }, [journalService])

  useEffect(() => {
    const initService = async () => {
      const service = new JournalService(config.dataPath)
      await service.initialize()

      const registry = new CommandRegistry()
      const manager = new PluginManager(config.dataPath, config, registry)

      // 標準AIコマンドを登録
      registry.register(new QuestionCommand())
      registry.register(new SummaryCommand())
      registry.register(new AdviceCommand())
      registry.register(new HelpCommand())

      // プラグインマネージャーを初期化
      await manager.initialize()

      setJournalService(service)
      setSearchService(new SearchService(service))
      setCommandRegistry(registry)
      setPluginManager(manager)
      setCategories(service.getCategories())

      // 初期の最終更新時刻を設定
      const initialUpdateTime = await service.getLastUpdateTime()
      setLastUpdateTime(initialUpdateTime)

      setIsReady(true)
    }

    initService().catch(error => {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize service:', error)
    })
  }, [config])

  return {
    isReady,
    journalService,
    searchService,
    commandRegistry,
    pluginManager,
    categories,
    lastUpdateTime,
    refreshCategories,
  }
}
