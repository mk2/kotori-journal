import fs from 'fs/promises'
import path from 'path'

export class FileLogger {
  private logFile: string
  private component?: string

  constructor(dataPath: string, component?: string) {
    if (component === 'chrome-extension') {
      this.logFile = path.join(dataPath, 'chrome-extension.log')
    } else {
      this.logFile = path.join(dataPath, 'server.log')
    }
    this.component = component
  }

  async log(level: 'INFO' | 'ERROR' | 'DEBUG', message: string, data?: any): Promise<void> {
    const timestamp = new Date().toISOString()
    const logEntry = `${timestamp} [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`

    try {
      await fs.appendFile(this.logFile, logEntry)
    } catch (error) {
      // Fallback to console if file logging fails
      // eslint-disable-next-line no-console
      console.error('Failed to write to log file:', error)
      // eslint-disable-next-line no-console
      console.log(logEntry.trim())
    }
  }

  async info(message: string, data?: any): Promise<void> {
    await this.log('INFO', message, data)
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${message}`, data || '')
  }

  async error(message: string, data?: any): Promise<void> {
    await this.log('ERROR', message, data)
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, data || '')
  }

  async debug(message: string, data?: any): Promise<void> {
    await this.log('DEBUG', message, data)
    // eslint-disable-next-line no-console
    console.log(`[DEBUG] ${message}`, data || '')
  }

  async warn(message: string, data?: any): Promise<void> {
    await this.log('INFO', message, data)
    // eslint-disable-next-line no-console
    console.log(`[WARN] ${message}`, data || '')
  }

  child(options: { component: string }): FileLogger {
    const dataPath = path.dirname(this.logFile)
    return new FileLogger(dataPath, options.component)
  }
}
