export interface JournalEntry {
  id: string
  content: string
  category: string
  timestamp: Date
  type?: 'entry' | 'ai_question' | 'ai_response'
}
