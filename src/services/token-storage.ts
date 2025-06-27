import fs from 'fs/promises'
import path from 'path'

interface TokenData {
  token: string
  createdAt: string
}

export class TokenStorage {
  private dataPath: string
  private tokenFile: string

  constructor(dataPath: string) {
    this.dataPath = dataPath
    this.tokenFile = path.join(dataPath, 'auth-token.json')
  }

  async loadToken(): Promise<string | null> {
    try {
      const content = await fs.readFile(this.tokenFile, 'utf-8')
      const data: TokenData = JSON.parse(content)
      if (data.token && typeof data.token === 'string') {
        return data.token
      }
      return null
    } catch {
      return null
    }
  }

  async saveToken(token: string): Promise<void> {
    const data: TokenData = {
      token,
      createdAt: new Date().toISOString(),
    }
    await fs.mkdir(this.dataPath, { recursive: true })
    await fs.writeFile(this.tokenFile, JSON.stringify(data, null, 2))
  }

  generateToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  async getOrCreateToken(): Promise<string> {
    const existingToken = await this.loadToken()
    if (existingToken) {
      return existingToken
    }

    const newToken = this.generateToken()
    await this.saveToken(newToken)
    return newToken
  }
}
