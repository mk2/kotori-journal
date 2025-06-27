import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import { TokenStorage } from '../../src/services/token-storage.js'

describe('TokenStorage', () => {
  const testDataPath = path.join(import.meta.dirname, '../tmp/token-storage-test')
  let tokenStorage: TokenStorage

  beforeEach(async () => {
    await fs.mkdir(testDataPath, { recursive: true })
    tokenStorage = new TokenStorage(testDataPath)
  })

  afterEach(async () => {
    await fs.rm(testDataPath, { recursive: true, force: true })
  })

  describe('loadToken', () => {
    it('should return null if token file does not exist', async () => {
      const token = await tokenStorage.loadToken()
      expect(token).toBeNull()
    })

    it('should load existing token from file', async () => {
      const testToken = 'test-token-12345'
      const tokenPath = path.join(testDataPath, 'auth-token.json')
      await fs.writeFile(tokenPath, JSON.stringify({ token: testToken }))

      const token = await tokenStorage.loadToken()
      expect(token).toBe(testToken)
    })

    it('should return null if token file is invalid JSON', async () => {
      const tokenPath = path.join(testDataPath, 'auth-token.json')
      await fs.writeFile(tokenPath, 'invalid json')

      const token = await tokenStorage.loadToken()
      expect(token).toBeNull()
    })

    it('should return null if token file does not contain token property', async () => {
      const tokenPath = path.join(testDataPath, 'auth-token.json')
      await fs.writeFile(tokenPath, JSON.stringify({ invalid: 'data' }))

      const token = await tokenStorage.loadToken()
      expect(token).toBeNull()
    })
  })

  describe('saveToken', () => {
    it('should save token to file', async () => {
      const testToken = 'test-token-12345'
      await tokenStorage.saveToken(testToken)

      const tokenPath = path.join(testDataPath, 'auth-token.json')
      const content = await fs.readFile(tokenPath, 'utf-8')
      const data = JSON.parse(content)

      expect(data.token).toBe(testToken)
      expect(data.createdAt).toBeDefined()
    })

    it('should overwrite existing token', async () => {
      const firstToken = 'first-token'
      const secondToken = 'second-token'

      await tokenStorage.saveToken(firstToken)
      await tokenStorage.saveToken(secondToken)

      const token = await tokenStorage.loadToken()
      expect(token).toBe(secondToken)
    })
  })

  describe('generateToken', () => {
    it('should generate a unique token', () => {
      const token1 = tokenStorage.generateToken()
      const token2 = tokenStorage.generateToken()

      expect(token1).toBeDefined()
      expect(token2).toBeDefined()
      expect(token1).not.toBe(token2)
    })

    it('should generate a token with expected format', () => {
      const token = tokenStorage.generateToken()
      expect(token).toMatch(/^[a-z0-9]+$/)
      expect(token.length).toBeGreaterThan(10)
    })
  })

  describe('getOrCreateToken', () => {
    it('should create a new token if none exists', async () => {
      const token = await tokenStorage.getOrCreateToken()
      expect(token).toBeDefined()

      const loadedToken = await tokenStorage.loadToken()
      expect(loadedToken).toBe(token)
    })

    it('should return existing token if one exists', async () => {
      const existingToken = 'existing-token-12345'
      await tokenStorage.saveToken(existingToken)

      const token = await tokenStorage.getOrCreateToken()
      expect(token).toBe(existingToken)
    })

    it('should create a new token if loading fails', async () => {
      const tokenPath = path.join(testDataPath, 'auth-token.json')
      await fs.writeFile(tokenPath, 'invalid json')

      const token = await tokenStorage.getOrCreateToken()
      expect(token).toBeDefined()
      expect(token).toMatch(/^[a-z0-9]+$/)

      const loadedToken = await tokenStorage.loadToken()
      expect(loadedToken).toBe(token)
    })
  })
})
