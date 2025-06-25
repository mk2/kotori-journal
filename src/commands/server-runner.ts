#!/usr/bin/env node
import fs from 'fs/promises'
import path from 'path'
import { JournalService } from '../services/journal-service.js'
import { HTTPServer } from '../services/http-server.js'

async function startServer() {
  const dataPath =
    process.env.KOTORI_DATA_PATH || path.join(process.env.HOME || '', '.kotori-journal-data')
  const port = parseInt(process.env.KOTORI_SERVER_PORT || '8765', 10)
  const authToken = process.env.KOTORI_SERVER_TOKEN

  // Initialize services
  const journalService = new JournalService(dataPath)
  await journalService.initialize()

  // Create and start HTTP server
  const server = new HTTPServer(journalService, {
    port,
    authToken,
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
    // eslint-disable-next-line no-console
    console.log('Received SIGTERM, shutting down gracefully...')
    await server.stop()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    // eslint-disable-next-line no-console
    console.log('Received SIGINT, shutting down gracefully...')
    await server.stop()
    process.exit(0)
  })

  // Keep the process running
  process.stdin.resume()
}

startServer().catch(error => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', error)
  process.exit(1)
})
