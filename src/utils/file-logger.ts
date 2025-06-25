import fs from 'fs/promises'
import path from 'path'

export class FileLogger {
  private logFile: string

  constructor(dataPath: string) {
    this.logFile = path.join(dataPath, 'server.log')
  }

  async log(level: 'INFO' | 'ERROR' | 'DEBUG', message: string, data?: any): Promise<void> {
    const timestamp = new Date().toISOString()
    const logEntry = `${timestamp} [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`

    try {
      await fs.appendFile(this.logFile, logEntry)
    } catch (error) {
      // Fallback to console if file logging fails
      console.error('Failed to write to log file:', error)
      console.log(logEntry.trim())
    }
  }

  async info(message: string, data?: any): Promise<void> {
    await this.log('INFO', message, data)
    console.log(`[INFO] ${message}`, data || '')
  }

  async error(message: string, data?: any): Promise<void> {
    await this.log('ERROR', message, data)
    console.error(`[ERROR] ${message}`, data || '')
  }

  async debug(message: string, data?: any): Promise<void> {
    await this.log('DEBUG', message, data)
    console.log(`[DEBUG] ${message}`, data || '')
  }
}
