import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { Config } from '../utils/config.js'
import { ensureDirectoryExists } from '../utils/directory.js'

interface ServerConfig {
  port: number
  authToken: string
  startedAt: string
}

export class ServerCommand {
  private config: Config
  private pidFile: string
  private configFile: string

  constructor(config: Config) {
    this.config = config
    this.pidFile = path.join(config.dataPath, 'server.pid')
    this.configFile = path.join(config.dataPath, 'server.json')
  }

  async execute(args: string[]): Promise<void> {
    const command = args[0] || 'help'

    switch (command) {
      case 'start':
        await this.start(args.slice(1))
        break
      case 'stop':
        await this.stop()
        break
      case 'status':
        await this.status()
        break
      default:
        this.showHelp()
    }
  }

  private async start(args: string[]): Promise<void> {
    // Check if server is already running
    if (await this.isRunning()) {
      throw new Error('Server is already running')
    }

    // Parse arguments
    let port = this.config.serverPort || 8765
    let authToken = this.config.serverAuthToken

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--port' && args[i + 1]) {
        port = parseInt(args[i + 1], 10)
        if (isNaN(port)) {
          throw new Error('Invalid port number')
        }
        i++
      } else if (args[i] === '--token' && args[i + 1]) {
        authToken = args[i + 1]
        i++
      }
    }

    // Start server in a detached process
    const env = { ...process.env }
    env.KOTORI_SERVER_PORT = port.toString()
    if (authToken) {
      env.KOTORI_SERVER_TOKEN = authToken
    }
    env.KOTORI_DATA_PATH = this.config.dataPath

    // Check if we're running in development mode
    const isDev = !import.meta.url.includes('/dist/')
    const runnerPath = isDev
      ? path.join(import.meta.dirname, 'server-runner.ts')
      : path.join(import.meta.dirname, 'server-runner.js')

    const spawnArgs = isDev
      ? [path.join(import.meta.dirname, '../../node_modules/.bin/tsx'), runnerPath]
      : [runnerPath]

    const serverProcess = spawn(
      isDev ? spawnArgs[0] : process.execPath,
      isDev ? spawnArgs.slice(1) : spawnArgs,
      {
        detached: true,
        stdio: 'ignore',
        env,
      }
    )

    serverProcess.unref()

    // Save PID and config
    await this.ensureDataDir()
    await fs.writeFile(this.pidFile, serverProcess.pid!.toString())

    const serverConfig: ServerConfig = {
      port,
      authToken: authToken || 'auto-generated',
      startedAt: new Date().toISOString(),
    }
    await fs.writeFile(this.configFile, JSON.stringify(serverConfig, null, 2))

    // eslint-disable-next-line no-console
    console.log(`Server started on port ${port}`)
    if (!authToken) {
      // Read the actual token from the server
      setTimeout(async () => {
        try {
          const config = await this.readServerConfig()
          // eslint-disable-next-line no-console
          console.log(`Auth token: ${config.authToken}`)
          // eslint-disable-next-line no-console
          console.log('\nSave this token for the Chrome extension configuration.')
        } catch {
          // Server might not have written the config yet
        }
      }, 1000)
    }
  }

  private async stop(): Promise<void> {
    if (!(await this.isRunning())) {
      // eslint-disable-next-line no-console
      console.log('Server is not running')
      return
    }

    const pid = await this.readPid()
    try {
      process.kill(pid, 'SIGTERM')
      await fs.unlink(this.pidFile)
      await fs.unlink(this.configFile)
      // eslint-disable-next-line no-console
      console.log('Server stopped')
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to stop server:', error)
    }
  }

  private async status(): Promise<void> {
    if (!(await this.isRunning())) {
      // eslint-disable-next-line no-console
      console.log('Server is not running')
      return
    }

    try {
      const pid = await this.readPid()
      const config = await this.readServerConfig()

      // eslint-disable-next-line no-console
      console.log('Server is running')
      // eslint-disable-next-line no-console
      console.log(`PID: ${pid}`)
      // eslint-disable-next-line no-console
      console.log(`Port: ${config.port}`)
      // eslint-disable-next-line no-console
      console.log(`Started: ${config.startedAt}`)
      // eslint-disable-next-line no-console
      console.log(`Auth token: ${config.authToken}`)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get server status:', error)
    }
  }

  private async isRunning(): Promise<boolean> {
    try {
      await fs.access(this.pidFile)
      const pid = await this.readPid()
      // Check if process is actually running
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }

  private async readPid(): Promise<number> {
    const pidStr = await fs.readFile(this.pidFile, 'utf-8')
    return parseInt(pidStr, 10)
  }

  private async readServerConfig(): Promise<ServerConfig> {
    const configStr = await fs.readFile(this.configFile, 'utf-8')
    return JSON.parse(configStr)
  }

  private async ensureDataDir(): Promise<void> {
    await ensureDirectoryExists(path.dirname(this.pidFile))
  }

  private showHelp(): void {
    // eslint-disable-next-line no-console
    console.log(`
Usage: kotori server <command> [options]

Commands:
  start [options]  Start the HTTP server
    --port <port>  Server port (default: 8765)
    --token <token>  Authentication token (auto-generated if not specified)
  
  stop            Stop the HTTP server
  
  status          Show server status

Examples:
  kotori server start
  kotori server start --port 9000
  kotori server start --port 9000 --token mySecretToken
  kotori server stop
  kotori server status
    `)
  }
}
