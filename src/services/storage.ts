import { promises as fs } from 'fs'
import * as path from 'path'
import { JournalEntry } from '../models/journal'

export interface SearchResult {
  date: string
  content: string
  matches: string[]
}

export class StorageService {
  constructor(private dataPath: string) {}

  async saveEntryToTemp(entry: JournalEntry): Promise<void> {
    const tempDir = path.join(this.dataPath, '.temp')
    await fs.mkdir(tempDir, { recursive: true })

    const filePath = path.join(tempDir, `${entry.id}.json`)
    await fs.writeFile(filePath, JSON.stringify(entry, null, 2))
  }

  async generateDailyReport(date: Date, entries: JournalEntry[]): Promise<void> {
    const year = date.getFullYear().toString()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')

    const reportDir = path.join(this.dataPath, year, month)
    await fs.mkdir(reportDir, { recursive: true })

    const reportPath = path.join(reportDir, `${day}.md`)
    const content = this.formatDailyReport(date, entries)

    await fs.writeFile(reportPath, content)
  }

  async loadTempEntries(): Promise<JournalEntry[]> {
    const tempDir = path.join(this.dataPath, '.temp')

    try {
      await fs.access(tempDir)
    } catch {
      return []
    }

    const files = await fs.readdir(tempDir)
    const jsonFiles = files.filter(file => file.endsWith('.json'))

    const entries: JournalEntry[] = []

    for (const file of jsonFiles) {
      const filePath = path.join(tempDir, file)
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const data = JSON.parse(content)

        entries.push({
          ...data,
          timestamp: new Date(data.timestamp),
        })
      } catch (error) {
        // ファイルが存在しない場合や読み込みエラーの場合は無視
        // (並行実行で削除された可能性があるため)
        if (process.env.NODE_ENV !== 'test') {
          // eslint-disable-next-line no-console
          console.warn(`Failed to read temp file ${filePath}:`, error)
        }
      }
    }

    return entries
  }

  async clearTempEntries(): Promise<void> {
    const tempDir = path.join(this.dataPath, '.temp')

    try {
      await fs.access(tempDir)
    } catch {
      return
    }

    const files = await fs.readdir(tempDir)

    for (const file of files) {
      const filePath = path.join(tempDir, file)
      await fs.unlink(filePath)
    }
  }

  async clearSpecificTempEntries(entryIds: string[]): Promise<void> {
    const tempDir = path.join(this.dataPath, '.temp')

    try {
      await fs.access(tempDir)
    } catch {
      return
    }

    for (const entryId of entryIds) {
      const filePath = path.join(tempDir, `${entryId}.json`)
      try {
        await fs.unlink(filePath)
      } catch {
        // ファイルが存在しない場合は無視
      }
    }
  }

  async searchReports(keyword: string): Promise<SearchResult[]> {
    const results: SearchResult[] = []
    const lowerKeyword = keyword.toLowerCase()

    try {
      const years = await fs.readdir(this.dataPath)

      for (const year of years) {
        if (year.startsWith('.')) continue

        const yearPath = path.join(this.dataPath, year)
        const months = await fs.readdir(yearPath)

        for (const month of months) {
          const monthPath = path.join(yearPath, month)
          const days = await fs.readdir(monthPath)

          for (const dayFile of days) {
            if (!dayFile.endsWith('.md')) continue

            const filePath = path.join(monthPath, dayFile)
            const content = await fs.readFile(filePath, 'utf-8')

            if (content.toLowerCase().includes(lowerKeyword)) {
              const day = dayFile.replace('.md', '')
              const matches = this.extractMatches(content, keyword)

              results.push({
                date: `${year}-${month}-${day}`,
                content: content.substring(0, 500),
                matches,
              })
            }
          }
        }
      }
    } catch {
      // Directory doesn't exist yet
    }

    return results
  }

  private formatDailyReport(date: Date, entries: JournalEntry[]): string {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')

    let content = `# ${year}年${month}月${day}日の記録\n\n`

    if (entries.length === 0) {
      content += '記録がありません。\n'
      return content
    }

    const entriesByCategory = this.groupByCategory(entries)

    // 自動処理AI応答を収集
    const autoProcessedEntries = entries.filter(
      entry => entry.category === 'AI処理コンテンツ' && entry.metadata?.processedBy === 'claude-ai'
    )

    // AI会話を収集（質問と応答）
    const aiQuestions = entries.filter(entry => entry.type === 'ai_question')
    const aiResponses = entries.filter(entry => entry.type === 'ai_response')

    // AI会話がある場合は別セクションで表示
    if (aiQuestions.length > 0 || aiResponses.length > 0) {
      content += `## AI会話\n`

      // 質問と応答をペアにして時系列順に表示
      const aiConversations = this.pairAIConversations(aiQuestions, aiResponses)

      for (const conversation of aiConversations) {
        if (conversation.question) {
          const questionTime = this.formatTime(conversation.question.timestamp)
          content += `### ${questionTime} - 質問\n`
          content += `${conversation.question.content}\n\n`
        }

        if (conversation.response) {
          const responseTime = this.formatTime(conversation.response.timestamp)
          content += `### ${responseTime} - 応答\n`
          const responseContent = conversation.response.content
            .split('\n')
            .map((line: string) => `  ${line}`)
            .join('\n')
          content += `${responseContent}\n\n`
        }
      }
    }

    // 自動処理AI応答がある場合は別セクションで表示
    if (autoProcessedEntries.length > 0) {
      content += `## 自動処理されたコンテンツ（AI応答）\n`

      for (const entry of autoProcessedEntries) {
        const time = this.formatTime(entry.timestamp)
        const title = entry.metadata?.title || 'タイトルなし'
        const url = entry.metadata?.url || ''
        const patternName = entry.metadata?.patternName || '不明なパターン'

        content += `### ${time} - ${title}\n`
        content += `- URL: ${url}\n`
        content += `- 処理パターン: ${patternName}\n`
        content += `- 内容:\n`

        // AI応答の内容を整形して表示
        const responseContent = entry.content
          .replace(/^自動コンテンツ処理完了: .*\n\n/, '') // ヘッダー部分を除去
          .split('\n')
          .map((line: string) => `  ${line}`)
          .join('\n')

        content += `${responseContent}\n\n`
      }
    }

    // 通常のエントリーを表示（AI関連以外）
    for (const [category, categoryEntries] of Object.entries(entriesByCategory)) {
      // AI関連のエントリーは既に専用セクションで表示済みなのでスキップ
      if (category === 'AI処理コンテンツ') {
        const nonAutoProcessedEntries = categoryEntries.filter(
          entry => entry.metadata?.processedBy !== 'claude-ai'
        )

        if (nonAutoProcessedEntries.length > 0) {
          content += `## ${category}\n`

          for (const entry of nonAutoProcessedEntries) {
            const time = this.formatTime(entry.timestamp)
            content += `- ${time} - ${entry.content}\n`
          }

          content += '\n'
        }
      } else if (category === 'AI') {
        // AIカテゴリのエントリーで、ai_question/ai_responseでないものがあれば表示
        const nonConversationEntries = categoryEntries.filter(
          entry => entry.type !== 'ai_question' && entry.type !== 'ai_response'
        )

        if (nonConversationEntries.length > 0) {
          content += `## ${category}\n`

          for (const entry of nonConversationEntries) {
            const time = this.formatTime(entry.timestamp)
            content += `- ${time} - ${entry.content}\n`
          }

          content += '\n'
        }
      } else {
        content += `## ${category}\n`

        for (const entry of categoryEntries) {
          const time = this.formatTime(entry.timestamp)
          content += `- ${time} - ${entry.content}\n`
        }

        content += '\n'
      }
    }

    return content
  }

  private pairAIConversations(
    questions: JournalEntry[],
    responses: JournalEntry[]
  ): Array<{ question?: JournalEntry; response?: JournalEntry }> {
    const conversations: Array<{ question?: JournalEntry; response?: JournalEntry }> = []

    // すべてのAI関連エントリーを時系列順にソート
    const allEntries = [...questions, ...responses].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    )

    let currentQuestion: JournalEntry | undefined

    for (const entry of allEntries) {
      if (entry.type === 'ai_question') {
        // 前の質問が未完了の場合は単独で追加
        if (currentQuestion) {
          conversations.push({ question: currentQuestion })
        }
        currentQuestion = entry
      } else if (entry.type === 'ai_response' && currentQuestion) {
        // 質問と応答をペアにして追加
        conversations.push({
          question: currentQuestion,
          response: entry,
        })
        currentQuestion = undefined
      } else if (entry.type === 'ai_response') {
        // 質問のない応答は単独で追加
        conversations.push({ response: entry })
      }
    }

    // 最後に未完了の質問があれば追加
    if (currentQuestion) {
      conversations.push({ question: currentQuestion })
    }

    return conversations
  }

  private groupByCategory(entries: JournalEntry[]): Record<string, JournalEntry[]> {
    const grouped: Record<string, JournalEntry[]> = {}

    for (const entry of entries) {
      if (!grouped[entry.category]) {
        grouped[entry.category] = []
      }
      grouped[entry.category].push(entry)
    }

    return grouped
  }

  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  async getLastUpdateTime(): Promise<number> {
    const tempDir = path.join(this.dataPath, '.temp')

    try {
      await fs.access(tempDir)
      const files = await fs.readdir(tempDir)
      const jsonFiles = files.filter(file => file.endsWith('.json'))

      if (jsonFiles.length === 0) {
        return 0
      }

      let latestTime = 0

      for (const file of jsonFiles) {
        const filePath = path.join(tempDir, file)
        const stats = await fs.stat(filePath)
        const mtime = stats.mtime.getTime()

        if (mtime > latestTime) {
          latestTime = mtime
        }
      }

      return latestTime
    } catch {
      return 0
    }
  }

  private extractMatches(content: string, keyword: string): string[] {
    const matches: string[] = []
    const lines = content.split('\n')
    const lowerKeyword = keyword.toLowerCase()

    for (const line of lines) {
      if (line.toLowerCase().includes(lowerKeyword)) {
        matches.push(line.trim())
      }
    }

    return matches.slice(0, 5) // Return max 5 matches
  }
}
