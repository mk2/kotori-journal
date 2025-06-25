import type {
  ContentPattern,
  ContentProcessingRequest,
  ContentProcessingResponse,
  ExtractedContent,
} from '../types/content-processing'
import type { ExtensionConfig } from '../types'

export class ContentProcessingService {
  async getMatchingPatterns(url: string): Promise<ContentPattern[]> {
    try {
      const config = await this.getConfig()
      if (!config.enabled || !config.authToken) {
        console.log('[ContentProcessingService] Extension disabled or no auth token')
        return []
      }

      const encodedUrl = encodeURIComponent(url)
      const response = await fetch(`${config.serverUrl}/api/content-patterns/match/${encodedUrl}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.authToken}`,
        },
      })

      if (!response.ok) {
        console.error(
          '[ContentProcessingService] Failed to get matching patterns:',
          response.status
        )
        return []
      }

      const result = await response.json()
      return result.patterns || []
    } catch (error) {
      console.error('[ContentProcessingService] Error getting matching patterns:', error)
      return []
    }
  }

  async processContent(
    url: string,
    title: string,
    content: ExtractedContent,
    patternId: string
  ): Promise<ContentProcessingResponse | null> {
    try {
      const config = await this.getConfig()
      if (!config.enabled || !config.authToken) {
        console.log('[ContentProcessingService] Extension disabled or no auth token')
        return null
      }

      const request: ContentProcessingRequest = {
        url,
        title,
        content: content.mainContent,
        patternId,
      }

      console.log('[ContentProcessingService] Processing content:', {
        url,
        patternId,
        contentLength: content.mainContent.length,
      })

      const response = await fetch(`${config.serverUrl}/api/content-processing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.authToken}`,
        },
        body: JSON.stringify(request),
      })

      const result = await response.json()

      if (response.ok) {
        console.log('[ContentProcessingService] Content processed successfully:', result)
        return result
      } else {
        console.error('[ContentProcessingService] Content processing failed:', result)
        return result
      }
    } catch (error) {
      console.error('[ContentProcessingService] Error processing content:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async getAllPatterns(): Promise<ContentPattern[]> {
    try {
      const config = await this.getConfig()
      if (!config.enabled || !config.authToken) {
        return []
      }

      const response = await fetch(`${config.serverUrl}/api/content-patterns`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.authToken}`,
        },
      })

      if (!response.ok) {
        console.error('[ContentProcessingService] Failed to get patterns:', response.status)
        return []
      }

      const result = await response.json()
      return result.patterns || []
    } catch (error) {
      console.error('[ContentProcessingService] Error getting patterns:', error)
      return []
    }
  }

  async createPattern(
    name: string,
    urlPattern: string,
    prompt: string,
    enabled: boolean = true
  ): Promise<ContentPattern | null> {
    try {
      const config = await this.getConfig()
      if (!config.enabled || !config.authToken) {
        return null
      }

      const response = await fetch(`${config.serverUrl}/api/content-patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.authToken}`,
        },
        body: JSON.stringify({ name, urlPattern, prompt, enabled }),
      })

      if (!response.ok) {
        console.error('[ContentProcessingService] Failed to create pattern:', response.status)
        return null
      }

      const result = await response.json()
      return result.pattern
    } catch (error) {
      console.error('[ContentProcessingService] Error creating pattern:', error)
      return null
    }
  }

  async updatePattern(id: string, updates: Partial<ContentPattern>): Promise<boolean> {
    try {
      const config = await this.getConfig()
      if (!config.enabled || !config.authToken) {
        return false
      }

      const response = await fetch(`${config.serverUrl}/api/content-patterns/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.authToken}`,
        },
        body: JSON.stringify(updates),
      })

      return response.ok
    } catch (error) {
      console.error('[ContentProcessingService] Error updating pattern:', error)
      return false
    }
  }

  async deletePattern(id: string): Promise<boolean> {
    try {
      const config = await this.getConfig()
      if (!config.enabled || !config.authToken) {
        return false
      }

      const response = await fetch(`${config.serverUrl}/api/content-patterns/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${config.authToken}`,
        },
      })

      return response.ok
    } catch (error) {
      console.error('[ContentProcessingService] Error deleting pattern:', error)
      return false
    }
  }

  private async getConfig(): Promise<ExtensionConfig> {
    const result = await chrome.storage.local.get(['serverUrl', 'authToken', 'enabled'])
    return {
      serverUrl: result.serverUrl || 'http://localhost:8765',
      authToken: result.authToken || '',
      enabled: result.enabled !== false, // Default to true
    }
  }
}
