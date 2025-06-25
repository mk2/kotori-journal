import express, { Application, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { Server } from 'http'
import { JournalService } from './journal-service.js'

interface BrowserHistoryEntry {
  url: string
  title: string
  visitedAt: string
  duration: number
  ogp?: {
    title?: string
    description?: string
    image?: string
  }
}

interface HTTPServerOptions {
  port?: number
  authToken?: string
}

export class HTTPServer {
  private app: Application
  private server: Server | null = null
  private port: number
  private authToken: string
  private journalService: JournalService

  constructor(journalService: JournalService, options: HTTPServerOptions = {}) {
    this.journalService = journalService
    this.port = options.port ?? 8765
    this.authToken = options.authToken ?? this.generateToken()
    this.app = this.createApp()
  }

  private generateToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  private createApp(): Application {
    const app = express()

    // CORS configuration - only allow localhost
    app.use(
      cors({
        origin: (origin, callback) => {
          if (
            !origin ||
            origin.startsWith('http://localhost') ||
            origin.startsWith('chrome-extension://')
          ) {
            callback(null, true)
          } else {
            callback(new Error('Not allowed by CORS'))
          }
        },
        credentials: true,
      })
    )

    // Body parser with size limit
    app.use(bodyParser.json({ limit: '1mb' }))

    // Request logging in development
    if (process.env.NODE_ENV !== 'production') {
      app.use((req, res, next) => {
        // eslint-disable-next-line no-console
        console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
        next()
      })
    }

    // Authentication middleware
    const authenticate = (req: Request, res: Response, next: NextFunction): void => {
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const token = authHeader.substring(7)
      if (token !== this.authToken) {
        res.status(401).json({ error: 'Invalid token' })
        return
      }

      next()
    }

    // Browser history endpoint
    app.post(
      '/api/browser-history',
      authenticate,
      async (req: Request, res: Response): Promise<void> => {
        try {
          const entry = req.body as BrowserHistoryEntry

          // Validate required fields
          if (
            !entry.url ||
            !entry.title ||
            !entry.visitedAt ||
            typeof entry.duration !== 'number'
          ) {
            res.status(400).json({ error: 'Missing required fields' })
            return
          }

          // Validate field lengths
          if (entry.title.length > 1000 || entry.url.length > 2000) {
            res.status(400).json({ error: 'Field too long' })
            return
          }

          // Create journal entry content
          const displayTitle = entry.ogp?.title || entry.title
          const content = `Visited: ${displayTitle} (URL: ${entry.url}, Duration: ${entry.duration}s)`

          // Add metadata
          const metadata: Record<string, unknown> = {
            url: entry.url,
            duration: entry.duration,
          }

          if (entry.ogp) {
            metadata.ogp = entry.ogp
          }

          // Save to journal with metadata
          const journalEntry = await this.journalService.addEntry(
            content,
            'Web閲覧',
            'entry',
            metadata
          )

          res.status(201).json({
            success: true,
            entry: {
              id: journalEntry.id,
              timestamp: journalEntry.timestamp,
            },
          })
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Error processing browser history:', error)
          res.status(500).json({ error: 'Internal server error' })
        }
      }
    )

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    return app
  }

  async start(): Promise<void> {
    if (this.server) {
      throw new Error('Server is already running')
    }

    return new Promise(resolve => {
      this.server = this.app.listen(this.port, () => {
        if (this.server) {
          const addr = this.server.address()
          if (addr && typeof addr === 'object') {
            this.port = addr.port
          }
        }
        // eslint-disable-next-line no-console
        console.log(`HTTP server started on port ${this.port}`)
        // eslint-disable-next-line no-console
        console.log(`Auth token: ${this.authToken}`)
        resolve()
      })
    })
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return
    }

    return new Promise(resolve => {
      this.server!.close(() => {
        this.server = null
        // eslint-disable-next-line no-console
        console.log('HTTP server stopped')
        resolve()
      })
    })
  }

  isRunning(): boolean {
    return this.server !== null
  }

  getPort(): number {
    if (!this.server) {
      throw new Error('Server is not running')
    }
    return this.port
  }

  getApp(): Application {
    return this.app
  }

  getAuthToken(): string {
    return this.authToken
  }
}
