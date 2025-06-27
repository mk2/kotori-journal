import express, { Application, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { Server } from 'http'
import { JournalService } from './journal-service.js'
import { FileLogger } from '../utils/file-logger.js'
import { ContentPatternManager } from '../models/content-pattern.js'
import { ContentProcessor } from './content-processor.js'
import { ContentProcessingRequest } from '../types/content-processing.js'
import { TokenStorage } from './token-storage.js'

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

interface BrowserHistoryCreateEntry {
  url: string
  title: string
  visitedAt: string
  ogp?: {
    title?: string
    description?: string
    image?: string
  }
}

interface BrowserHistoryUpdateEntry {
  entryId: string
  duration: number
}

interface HTTPServerOptions {
  port?: number
  authToken?: string
  logger?: FileLogger
  patternManager?: ContentPatternManager
  contentProcessor?: ContentProcessor
  tokenStorage?: TokenStorage
}

export class HTTPServer {
  private app: Application
  private server: Server | null = null
  private port: number
  private authToken: string
  private journalService: JournalService
  private logger?: FileLogger
  private patternManager?: ContentPatternManager
  private contentProcessor?: ContentProcessor
  private tokenStorage?: TokenStorage

  constructor(journalService: JournalService, options: HTTPServerOptions = {}) {
    this.journalService = journalService
    this.port = options.port ?? 8765
    this.authToken = options.authToken ?? this.generateToken()
    this.logger = options.logger
    this.patternManager = options.patternManager
    this.contentProcessor = options.contentProcessor
    this.tokenStorage = options.tokenStorage
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
          await this.logger?.info('Received browser history request', req.body)

          const entry = req.body as BrowserHistoryEntry

          // Validate required fields
          if (
            !entry.url ||
            !entry.title ||
            !entry.visitedAt ||
            typeof entry.duration !== 'number'
          ) {
            await this.logger?.error('Validation failed - missing required fields', {
              hasUrl: !!entry.url,
              hasTitle: !!entry.title,
              hasVisitedAt: !!entry.visitedAt,
              hasDuration: typeof entry.duration === 'number',
            })
            res.status(400).json({ error: 'Missing required fields' })
            return
          }

          // Validate field lengths
          if (entry.title.length > 1000 || entry.url.length > 2000) {
            await this.logger?.error('Validation failed - field too long', {
              titleLength: entry.title.length,
              urlLength: entry.url.length,
            })
            res.status(400).json({ error: 'Field too long' })
            return
          }

          // Create journal entry content
          const displayTitle = entry.ogp?.title || entry.title
          const content = `Visited: ${displayTitle} (URL: ${entry.url}, Duration: ${entry.duration}s)`

          await this.logger?.info('Creating journal entry', { content, category: 'Web閲覧' })

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

          await this.logger?.info('Journal entry created', {
            id: journalEntry.id,
            content: journalEntry.content,
            timestamp: journalEntry.timestamp,
          })

          res.status(201).json({
            success: true,
            entry: {
              id: journalEntry.id,
              timestamp: journalEntry.timestamp,
            },
          })
        } catch (error) {
          await this.logger?.error('Error processing browser history', {
            error: error instanceof Error ? error.message : error,
          })
          res.status(500).json({ error: 'Internal server error' })
        }
      }
    )

    // Create browser history entry endpoint
    app.post(
      '/api/browser-history/create',
      authenticate,
      async (req: Request, res: Response): Promise<void> => {
        try {
          await this.logger?.info('Received browser history create request', req.body)

          const entry = req.body as BrowserHistoryCreateEntry

          // Validate required fields
          if (!entry.url || !entry.title || !entry.visitedAt) {
            await this.logger?.error('Create validation failed - missing required fields', {
              hasUrl: !!entry.url,
              hasTitle: !!entry.title,
              hasVisitedAt: !!entry.visitedAt,
            })
            res.status(400).json({ error: 'Missing required fields' })
            return
          }

          // Create journal entry content
          const displayTitle = entry.ogp?.title || entry.title
          const content = `Visited: ${displayTitle} (URL: ${entry.url})`

          await this.logger?.info('Creating initial journal entry', {
            content,
            category: 'Web閲覧',
          })

          // Add metadata
          const metadata: Record<string, unknown> = {
            url: entry.url,
            duration: 0, // Will be updated later
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

          await this.logger?.info('Initial journal entry created', {
            id: journalEntry.id,
            content: journalEntry.content,
            timestamp: journalEntry.timestamp,
          })

          res.status(201).json({
            success: true,
            entry: {
              id: journalEntry.id,
              timestamp: journalEntry.timestamp,
            },
          })
        } catch (error) {
          await this.logger?.error('Error creating browser history entry', {
            error: error instanceof Error ? error.message : error,
          })
          res.status(500).json({ error: 'Internal server error' })
        }
      }
    )

    // Update browser history entry with duration
    app.patch(
      '/api/browser-history/update',
      authenticate,
      async (req: Request, res: Response): Promise<void> => {
        try {
          await this.logger?.info('Received browser history update request', req.body)

          const update = req.body as BrowserHistoryUpdateEntry

          // Validate required fields
          if (!update.entryId || typeof update.duration !== 'number') {
            await this.logger?.error('Update validation failed - missing required fields', {
              hasEntryId: !!update.entryId,
              hasDuration: typeof update.duration === 'number',
            })
            res.status(400).json({ error: 'Missing required fields' })
            return
          }

          await this.logger?.info('Updating journal entry with duration', {
            entryId: update.entryId,
            duration: update.duration,
          })

          // Update the journal entry
          const success = await this.updateJournalEntryDuration(update.entryId, update.duration)

          if (success) {
            await this.logger?.info('Journal entry updated successfully', {
              entryId: update.entryId,
              duration: update.duration,
            })
            res.json({ success: true })
          } else {
            await this.logger?.error('Journal entry not found', { entryId: update.entryId })
            res.status(404).json({ error: 'Entry not found' })
          }
        } catch (error) {
          await this.logger?.error('Error updating browser history entry', {
            error: error instanceof Error ? error.message : error,
          })
          res.status(500).json({ error: 'Internal server error' })
        }
      }
    )

    // Content patterns CRUD endpoints
    app.get(
      '/api/content-patterns',
      authenticate,
      async (req: Request, res: Response): Promise<void> => {
        try {
          if (!this.patternManager) {
            res.status(503).json({ error: 'Content pattern management not available' })
            return
          }

          const patterns = this.patternManager.getPatterns()
          res.json({ patterns })
        } catch (error) {
          await this.logger?.error('Error getting content patterns', {
            error: error instanceof Error ? error.message : error,
          })
          res.status(500).json({ error: 'Internal server error' })
        }
      }
    )

    app.post(
      '/api/content-patterns',
      authenticate,
      async (req: Request, res: Response): Promise<void> => {
        try {
          if (!this.patternManager) {
            res.status(503).json({ error: 'Content pattern management not available' })
            return
          }

          const { name, urlPattern, prompt, enabled = true } = req.body

          if (!name || !urlPattern || !prompt) {
            res.status(400).json({ error: 'Missing required fields: name, urlPattern, prompt' })
            return
          }

          const pattern = this.patternManager.addPattern(name, urlPattern, prompt, enabled)
          await this.journalService.savePatterns() // Save to storage
          await this.logger?.info('Content pattern created', { patternId: pattern.id, name })

          res.status(201).json({ pattern })
        } catch (error) {
          await this.logger?.error('Error creating content pattern', {
            error: error instanceof Error ? error.message : error,
          })
          res.status(500).json({ error: 'Internal server error' })
        }
      }
    )

    app.put(
      '/api/content-patterns/:id',
      authenticate,
      async (req: Request, res: Response): Promise<void> => {
        try {
          if (!this.patternManager) {
            res.status(503).json({ error: 'Content pattern management not available' })
            return
          }

          const { id } = req.params
          const updates = req.body

          const success = this.patternManager.updatePattern(id, updates)
          if (success) {
            await this.journalService.savePatterns() // Save to storage
            await this.logger?.info('Content pattern updated', { patternId: id })
            res.json({ success: true })
          } else {
            res.status(404).json({ error: 'Pattern not found' })
          }
        } catch (error) {
          await this.logger?.error('Error updating content pattern', {
            error: error instanceof Error ? error.message : error,
          })
          res.status(500).json({ error: 'Internal server error' })
        }
      }
    )

    app.delete(
      '/api/content-patterns/:id',
      authenticate,
      async (req: Request, res: Response): Promise<void> => {
        try {
          if (!this.patternManager) {
            res.status(503).json({ error: 'Content pattern management not available' })
            return
          }

          const { id } = req.params
          const success = this.patternManager.removePattern(id)

          if (success) {
            await this.journalService.savePatterns() // Save to storage
            await this.logger?.info('Content pattern deleted', { patternId: id })
            res.json({ success: true })
          } else {
            res.status(404).json({ error: 'Pattern not found' })
          }
        } catch (error) {
          await this.logger?.error('Error deleting content pattern', {
            error: error instanceof Error ? error.message : error,
          })
          res.status(500).json({ error: 'Internal server error' })
        }
      }
    )

    // Content processing endpoint
    app.post(
      '/api/content-processing',
      authenticate,
      async (req: Request, res: Response): Promise<void> => {
        try {
          if (!this.contentProcessor) {
            res.status(503).json({ error: 'Content processing not available' })
            return
          }

          const request = req.body as ContentProcessingRequest

          if (!request.url || !request.title || !request.content || !request.patternId) {
            res
              .status(400)
              .json({ error: 'Missing required fields: url, title, content, patternId' })
            return
          }

          await this.logger?.info('Processing content request', {
            url: request.url,
            patternId: request.patternId,
          })

          const result = await this.contentProcessor.processContent(request)

          if (result.success) {
            res.json(result)
          } else {
            res.status(400).json(result)
          }
        } catch (error) {
          await this.logger?.error('Error processing content', {
            error: error instanceof Error ? error.message : error,
          })
          res.status(500).json({ error: 'Internal server error' })
        }
      }
    )

    // Auto content processing endpoint (server-side pattern matching and processing)
    app.post(
      '/api/auto-content-processing',
      authenticate,
      async (req: Request, res: Response): Promise<void> => {
        try {
          if (!this.contentProcessor || !this.patternManager) {
            res.status(503).json({ error: 'Content processing not available' })
            return
          }

          const { url, title, content } = req.body

          if (!url || !title || !content) {
            res.status(400).json({ error: 'Missing required fields: url, title, content' })
            return
          }

          await this.logger?.info('Auto-processing content request', {
            url,
            contentLength: content.length,
          })

          // Find matching patterns for this URL
          const matchingPatterns = this.patternManager.findMatchingPatterns(url)

          if (matchingPatterns.length === 0) {
            await this.logger?.info('No matching patterns found for auto-processing', { url })
            res.json({ success: false, message: 'No matching patterns found' })
            return
          }

          const results = []

          // Process content with each matching pattern
          for (const pattern of matchingPatterns) {
            try {
              await this.logger?.info('Auto-processing with pattern', {
                url,
                patternId: pattern.id,
                patternName: pattern.name,
              })

              const result = await this.contentProcessor.processContent({
                url,
                title,
                content,
                patternId: pattern.id,
              })

              if (result.success) {
                results.push({
                  patternId: pattern.id,
                  patternName: pattern.name,
                  entryId: result.entryId,
                  success: true,
                })

                await this.logger?.info('Auto-processing successful', {
                  url,
                  patternName: pattern.name,
                  entryId: result.entryId,
                })
              } else {
                results.push({
                  patternId: pattern.id,
                  patternName: pattern.name,
                  error: result.error,
                  success: false,
                })
              }
            } catch (error) {
              await this.logger?.error('Error in auto-processing with pattern', {
                url,
                patternId: pattern.id,
                error: error instanceof Error ? error.message : error,
              })

              results.push({
                patternId: pattern.id,
                patternName: pattern.name,
                error: 'Processing error',
                success: false,
              })
            }
          }

          res.json({
            success: true,
            processed: results.filter(r => r.success).length,
            total: results.length,
            results,
          })
        } catch (error) {
          await this.logger?.error('Error in auto-content-processing', {
            error: error instanceof Error ? error.message : error,
          })
          res.status(500).json({ error: 'Internal server error' })
        }
      }
    )

    // Get enabled patterns for URL matching
    app.get(
      '/api/content-patterns/match/:url',
      authenticate,
      async (req: Request, res: Response): Promise<void> => {
        try {
          if (!this.patternManager) {
            res.status(503).json({ error: 'Content pattern management not available' })
            return
          }

          const url = decodeURIComponent(req.params.url)
          const matchingPatterns = this.patternManager.findMatchingPatterns(url)

          res.json({ patterns: matchingPatterns })
        } catch (error) {
          await this.logger?.error('Error matching content patterns', {
            error: error instanceof Error ? error.message : error,
          })
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
        this.logger?.info(`HTTP server started on port ${this.port}`)
        this.logger?.info(`Auth token: ${this.authToken}`)
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
        this.logger?.info('HTTP server stopped')
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

  private async updateJournalEntryDuration(entryId: string, duration: number): Promise<boolean> {
    const entry = this.journalService.getEntryById(entryId)
    if (!entry) {
      return false
    }

    // Update content to include duration
    const displayTitle =
      (entry.metadata as any)?.ogp?.title ||
      entry.content.match(/Visited: (.+?) \(/)?.[1] ||
      'Unknown'
    const url = (entry.metadata as any)?.url || 'Unknown'
    const newContent = `Visited: ${displayTitle} (URL: ${url}, Duration: ${duration}s)`

    // Update metadata
    const newMetadata = {
      ...entry.metadata,
      duration,
    }

    return await this.journalService.updateEntry(entryId, {
      content: newContent,
      metadata: newMetadata,
    })
  }
}
