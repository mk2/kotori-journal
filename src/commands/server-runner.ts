#!/usr/bin/env node
import fs from 'fs/promises'
import path from 'path'
import { JournalService } from '../services/journal-service.js'
import { HTTPServer } from '../services/http-server.js'
import { FileLogger } from '../utils/file-logger.js'

async function startServer() {
  const dataPath =
    process.env.KOTORI_DATA_PATH || path.join(process.env.HOME || '', '.kotori-journal-data')
  const port = parseInt(process.env.KOTORI_SERVER_PORT || '8765', 10)
  const authToken = process.env.KOTORI_SERVER_TOKEN

  // Initialize logger
  const logger = new FileLogger(dataPath)
  await logger.info('Starting kotori-journal HTTP server', { port, dataPath })

  // Initialize services
  const journalService = new JournalService(dataPath)
  await journalService.initialize()
  await logger.info('JournalService initialized')

  // Create and start HTTP server
  const server = new HTTPServer(journalService, {
    port,
    authToken,
    logger,
    patternManager: journalService.getPatternManager(),
    contentProcessor: journalService.getContentProcessor(),
  })

  // Update config file with actual auth token
  const configFile = path.join(dataPath, 'server.json')
  const config = {
    port,
    authToken: server.getAuthToken(),
    startedAt: new Date().toISOString(),
  }
  await fs.writeFile(configFile, JSON.stringify(config, null, 2))

  await server.start()

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    await logger.info('Received SIGTERM, shutting down gracefully...')
    // eslint-disable-next-line no-console
    console.log('Received SIGTERM, shutting down gracefully...')
    await server.stop()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    await logger.info('Received SIGINT, shutting down gracefully...')
    // eslint-disable-next-line no-console
    console.log('Received SIGINT, shutting down gracefully...')
    await server.stop()
    process.exit(0)
  })

  // Keep the process running
  process.stdin.resume()
}

startServer().catch(async error => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', error)

  try {
    const logger = new FileLogger(
      process.env.KOTORI_DATA_PATH || path.join(process.env.HOME || '', '.kotori-journal-data')
    )
    await logger.error('Failed to start server', { error: error.message, stack: error.stack })
  } catch {
    // Ignore logger errors at this point
  }

  process.exit(1)
})
