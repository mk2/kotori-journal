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
        // コンソール出力は無効化
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
        // コンソール出力は無効化
        return []
      }

      const result = await response.json()
      return result.patterns || []
    } catch {
      // コンソール出力は無効化
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
        // コンソール出力は無効化
        return null
      }

      const request: ContentProcessingRequest = {
        url,
        title,
        content: content.mainContent,
        patternId,
      }

      // コンソール出力は無効化

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
        // コンソール出力は無効化
        return result
      } else {
        // コンソール出力は無効化
        return result
      }
    } catch (error) {
      // コンソール出力は無効化
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
        // コンソール出力は無効化
        return []
      }

      const result = await response.json()
      return result.patterns || []
    } catch {
      // コンソール出力は無効化
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
        // コンソール出力は無効化
        return null
      }

      const result = await response.json()
      return result.pattern
    } catch {
      // コンソール出力は無効化
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
    } catch {
      // コンソール出力は無効化
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
    } catch {
      // コンソール出力は無効化
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
