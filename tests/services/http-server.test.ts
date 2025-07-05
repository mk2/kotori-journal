import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { HTTPServer } from '../../src/services/http-server.js'
import { JournalService } from '../../src/services/journal-service.js'
import type { JournalEntry } from '../../src/models/journal.js'

vi.mock('../../src/services/journal-service.js')

describe('HTTPServer', () => {
  let server: HTTPServer
  let journalService: JournalService

  beforeEach(() => {
    journalService = new JournalService('test-data-path')
    server = new HTTPServer(journalService, {
      port: 0, // Use random port for testing
      authToken: 'test-token',
    })
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('Server lifecycle', () => {
    it('should start and stop the server', async () => {
      await server.start()
      expect(server.isRunning()).toBe(true)

      await server.stop()
      expect(server.isRunning()).toBe(false)
    })

    it('should return the actual port after starting', async () => {
      await server.start()
      const port = server.getPort()
      expect(port).toBeGreaterThan(0)
    })
  })

  describe('POST /api/browser-history', () => {
    it('should reject requests without authentication', async () => {
      await server.start()
      const app = server.getApp()

      const response = await request(app).post('/api/browser-history').send({
        url: 'https://example.com',
        title: 'Example',
        visitedAt: new Date().toISOString(),
        duration: 30,
      })

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Unauthorized')
    })

    it('should reject requests with invalid token', async () => {
      await server.start()
      const app = server.getApp()

      const response = await request(app)
        .post('/api/browser-history')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          url: 'https://example.com',
          title: 'Example',
          visitedAt: new Date().toISOString(),
          duration: 30,
        })

      expect(response.status).toBe(401)
    })

    it('should accept valid browser history entry', async () => {
      await server.start()
      const app = server.getApp()

      const mockEntry: JournalEntry = {
        id: 'test-id',
        content: 'Visited: Example (URL: https://example.com, Duration: 30s)',
        category: 'Web閲覧',
        timestamp: new Date(),
        type: 'entry',
        metadata: {
          url: 'https://example.com',
          duration: 30,
        },
      }

      vi.mocked(journalService.addEntry).mockResolvedValue(mockEntry)

      const response = await request(app)
        .post('/api/browser-history')
        .set('Authorization', 'Bearer test-token')
        .send({
          url: 'https://example.com',
          title: 'Example',
          visitedAt: new Date().toISOString(),
          duration: 30,
        })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('entry')
      expect(vi.mocked(journalService.addEntry)).toHaveBeenCalledWith(
        expect.stringContaining('Visited: Example'),
        'Web閲覧',
        'entry',
        {
          url: 'https://example.com',
          duration: 30,
        }
      )
    })

    it('should handle OGP data when provided', async () => {
      await server.start()
      const app = server.getApp()

      const mockEntry: JournalEntry = {
        id: 'test-id',
        content: 'Visited: OGP Title (URL: https://example.com, Duration: 45s)',
        category: 'Web閲覧',
        timestamp: new Date(),
        type: 'entry',
        metadata: {
          url: 'https://example.com',
          duration: 45,
          ogp: {
            title: 'OGP Title',
            description: 'OGP Description',
            image: 'https://example.com/image.png',
          },
        },
      }

      vi.mocked(journalService.addEntry).mockResolvedValue(mockEntry)

      const response = await request(app)
        .post('/api/browser-history')
        .set('Authorization', 'Bearer test-token')
        .send({
          url: 'https://example.com',
          title: 'Page Title',
          visitedAt: new Date().toISOString(),
          duration: 45,
          ogp: {
            title: 'OGP Title',
            description: 'OGP Description',
            image: 'https://example.com/image.png',
          },
        })

      expect(response.status).toBe(201)
      expect(vi.mocked(journalService.addEntry)).toHaveBeenCalledWith(
        expect.stringContaining('Visited: OGP Title'),
        'Web閲覧',
        'entry',
        {
          url: 'https://example.com',
          duration: 45,
          ogp: {
            title: 'OGP Title',
            description: 'OGP Description',
            image: 'https://example.com/image.png',
          },
        }
      )
    })

    it('should validate required fields', async () => {
      await server.start()
      const app = server.getApp()

      const response = await request(app)
        .post('/api/browser-history')
        .set('Authorization', 'Bearer test-token')
        .send({
          // Missing required fields
          title: 'Example',
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should handle large payloads gracefully', async () => {
      await server.start()
      const app = server.getApp()

      const largePayload = {
        url: 'https://example.com',
        title: 'A'.repeat(10000), // Very long title
        visitedAt: new Date().toISOString(),
        duration: 30,
      }

      const response = await request(app)
        .post('/api/browser-history')
        .set('Authorization', 'Bearer test-token')
        .send(largePayload)

      expect(response.status).toBe(400)
    })
  })

  describe('CORS configuration', () => {
    it('should only allow localhost origins', async () => {
      await server.start()
      const app = server.getApp()

      const response = await request(app)
        .options('/api/browser-history')
        .set('Origin', 'http://localhost:3000')

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000')
    })

    it('should reject non-localhost origins', async () => {
      await server.start()
      const app = server.getApp()

      const response = await request(app)
        .options('/api/browser-history')
        .set('Origin', 'https://example.com')

      expect(response.headers['access-control-allow-origin']).toBeUndefined()
    })
  })
})
