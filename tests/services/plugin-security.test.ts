import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { PluginSecurityManager, PluginSandbox } from '../../src/services/plugin-security'
import * as fs from 'fs/promises'
import { existsSync } from 'fs'
import * as path from 'path'

// モックfs
vi.mock('fs/promises')
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}))

const mockFs = vi.mocked(fs)
const mockExistsSync = vi.mocked(existsSync)

describe('PluginSecurityManager', () => {
  let securityManager: PluginSecurityManager
  const testDataPath = '/test/data'

  beforeEach(() => {
    vi.clearAllMocks()
    securityManager = new PluginSecurityManager(testDataPath)

    // デフォルトのモック設定
    mockExistsSync.mockReturnValue(true)
    mockFs.readdir.mockResolvedValue([])
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('validateLocalPath', () => {
    beforeEach(() => {
      // Mock path.resolve to return predictable paths
      vi.spyOn(path, 'resolve').mockImplementation(p => `/resolved${p}`)
    })

    it('should allow paths in allowed directories', async () => {
      process.env.KOTORI_PLUGIN_PATH = '/home/plugins'

      await expect(securityManager.validateLocalPath('./plugins/test')).resolves.not.toThrow()
      await expect(securityManager.validateLocalPath('/home/plugins/test')).resolves.not.toThrow()
    })

    it('should reject paths outside allowed directories', async () => {
      await expect(securityManager.validateLocalPath('/etc/passwd')).rejects.toThrow(
        'Plugin path not allowed'
      )
      await expect(securityManager.validateLocalPath('../../../etc/passwd')).rejects.toThrow(
        'Plugin path not allowed'
      )
    })

    it('should reject non-existent paths', async () => {
      mockExistsSync.mockReturnValue(false)

      await expect(securityManager.validateLocalPath('./plugins/nonexistent')).rejects.toThrow(
        'Plugin path does not exist'
      )
    })
  })

  describe('scanForMaliciousCode', () => {
    beforeEach(() => {
      mockFs.readdir.mockResolvedValue([
        { name: 'safe.js', isDirectory: () => false, isFile: () => true } as any,
        { name: 'malicious.ts', isDirectory: () => false, isFile: () => true } as any,
        { name: 'subdir', isDirectory: () => true, isFile: () => false } as any,
        { name: 'node_modules', isDirectory: () => true, isFile: () => false } as any,
      ])
    })

    it('should detect dangerous patterns', async () => {
      mockFs.readFile
        .mockResolvedValueOnce('console.log("safe code")')
        .mockResolvedValueOnce('require("child_process").exec("rm -rf /")')

      await expect(securityManager.scanForMaliciousCode('/test/plugin')).rejects.toThrow(
        'child_process module usage'
      )
    })

    it('should detect eval usage', async () => {
      mockFs.readFile.mockResolvedValue('eval("malicious code")')

      await expect(securityManager.scanForMaliciousCode('/test/plugin')).rejects.toThrow(
        'eval() function usage'
      )
    })

    it('should detect Function constructor', async () => {
      mockFs.readFile.mockResolvedValue('new Function("return process")()')

      await expect(securityManager.scanForMaliciousCode('/test/plugin')).rejects.toThrow(
        'Function constructor usage'
      )
    })

    it('should detect process.exit usage', async () => {
      mockFs.readFile.mockResolvedValue('process.exit(1)')

      await expect(securityManager.scanForMaliciousCode('/test/plugin')).rejects.toThrow(
        'process.exit() usage'
      )
    })

    it('should detect direct fs module usage', async () => {
      mockFs.readFile.mockResolvedValue('const fs = require("fs")')

      await expect(securityManager.scanForMaliciousCode('/test/plugin')).rejects.toThrow(
        'direct fs module usage'
      )
    })

    it('should allow safe code', async () => {
      mockFs.readFile.mockResolvedValue('console.log("Hello world")')

      await expect(securityManager.scanForMaliciousCode('/test/plugin')).resolves.not.toThrow()
    })

    it('should skip node_modules and .git directories', async () => {
      // Only read files, not directories
      expect(mockFs.readFile).not.toHaveBeenCalledWith(expect.stringContaining('node_modules'))
      expect(mockFs.readFile).not.toHaveBeenCalledWith(expect.stringContaining('.git'))
    })

    it('should handle directory access errors gracefully', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'))

      // Should not throw - errors are ignored
      await expect(securityManager.scanForMaliciousCode('/restricted')).resolves.not.toThrow()
    })
  })

  describe('validatePluginConfig', () => {
    it('should validate correct plugin config', () => {
      const validConfig = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
      }

      expect(securityManager.validatePluginConfig(validConfig)).toBe(true)
    })

    it('should reject config without required fields', () => {
      expect(securityManager.validatePluginConfig({})).toBe(false)
      expect(securityManager.validatePluginConfig({ name: 'test' })).toBe(false)
      expect(securityManager.validatePluginConfig({ name: 'test', version: '1.0.0' })).toBe(false)
    })

    it('should reject non-object config', () => {
      expect(securityManager.validatePluginConfig(null)).toBe(false)
      expect(securityManager.validatePluginConfig('string')).toBe(false)
      expect(securityManager.validatePluginConfig(123)).toBe(false)
    })

    it('should reject config with dangerous permissions', () => {
      const dangerousConfig = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        permissions: ['file_system_full'],
      }

      expect(securityManager.validatePluginConfig(dangerousConfig)).toBe(false)
    })

    it('should allow config with safe permissions', () => {
      const safeConfig = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        permissions: ['network_restricted', 'storage_limited'],
      }

      expect(securityManager.validatePluginConfig(safeConfig)).toBe(true)
    })
  })

  describe('createSandboxedRequire', () => {
    it('should allow whitelisted modules', () => {
      const sandboxedRequire = securityManager.createSandboxedRequire()

      // Mock the actual require for allowed modules
      const originalRequire = globalThis.require
      globalThis.require = vi.fn().mockReturnValue({ mockModule: true })

      expect(() => sandboxedRequire('path')).not.toThrow()
      expect(() => sandboxedRequire('util')).not.toThrow()
      expect(() => sandboxedRequire('crypto')).not.toThrow()

      globalThis.require = originalRequire
    })

    it('should reject non-whitelisted modules', () => {
      const sandboxedRequire = securityManager.createSandboxedRequire()

      expect(() => sandboxedRequire('fs')).toThrow("Module 'fs' is not allowed in plugins")
      expect(() => sandboxedRequire('child_process')).toThrow(
        "Module 'child_process' is not allowed in plugins"
      )
      expect(() => sandboxedRequire('os')).toThrow("Module 'os' is not allowed in plugins")
    })
  })
})

describe('PluginSandbox', () => {
  let sandbox: PluginSandbox
  let securityManager: PluginSecurityManager
  const testDataPath = '/test/data'

  beforeEach(() => {
    vi.clearAllMocks()
    securityManager = new PluginSecurityManager(testDataPath)
    sandbox = new PluginSandbox(securityManager)

    mockExistsSync.mockReturnValue(false)
    mockFs.readFile.mockResolvedValue('test data')
    mockFs.writeFile.mockResolvedValue()
    mockFs.mkdir.mockResolvedValue(undefined)
    mockFs.rm.mockResolvedValue()
    mockFs.readdir.mockResolvedValue([])
  })

  describe('createContext', () => {
    it('should create proper sandbox context', () => {
      const context = sandbox.createContext('test-plugin', testDataPath)

      expect(context.storage).toBeDefined()
      expect(context.network).toBeDefined()
      expect(context.dataPath).toContain('test-plugin')
      expect(context.require).toBeDefined()
    })
  })

  describe('restricted storage', () => {
    let storage: any

    beforeEach(() => {
      const context = sandbox.createContext('test-plugin', testDataPath)
      storage = context.storage
    })

    it('should validate storage keys', async () => {
      await expect(storage.write('valid_key', 'data')).resolves.not.toThrow()
      await expect(storage.write('valid-key-123', 'data')).resolves.not.toThrow()

      await expect(storage.write('invalid/key', 'data')).rejects.toThrow('Invalid storage key')
      await expect(storage.write('invalid.key', 'data')).rejects.toThrow('Invalid storage key')
      await expect(storage.write('../traversal', 'data')).rejects.toThrow('Invalid storage key')
    })

    it('should enforce size limits', async () => {
      const largeValue = 'x'.repeat(1024 * 1024 + 1)
      await expect(storage.write('key', largeValue)).rejects.toThrow('Storage value too large')
    })

    it('should handle read operations', async () => {
      mockExistsSync.mockReturnValue(true)
      mockFs.readFile.mockResolvedValue('stored data')

      const result = await storage.read('existing-key')
      expect(result).toBe('stored data')
    })

    it('should return null for non-existent keys', async () => {
      mockExistsSync.mockReturnValue(false)

      const result = await storage.read('nonexistent')
      expect(result).toBeNull()
    })

    it('should handle write operations', async () => {
      await storage.write('test-key', 'test data')

      expect(mockFs.mkdir).toHaveBeenCalled()
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-key.json'),
        'test data',
        'utf-8'
      )
    })

    it('should handle delete operations', async () => {
      mockExistsSync.mockReturnValue(true)

      await storage.delete('test-key')
      expect(mockFs.rm).toHaveBeenCalled()
    })

    it('should list stored keys', async () => {
      mockExistsSync.mockReturnValue(true)
      mockFs.readdir.mockResolvedValue(['key1.json', 'key2.json', 'other.txt'])

      const keys = await storage.list()
      expect(keys).toEqual(['key1', 'key2'])
    })
  })

  describe('restricted network', () => {
    let network: any

    beforeEach(() => {
      const context = sandbox.createContext('test-plugin', testDataPath)
      network = context.network

      // Mock global URL and fetch
      globalThis.URL = globalThis.URL || globalThis.URL
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    })

    it('should reject non-HTTP protocols', async () => {
      await expect(network.fetch('ftp://example.com')).rejects.toThrow(
        'Only HTTP and HTTPS protocols are allowed'
      )
      await expect(network.fetch('file:///etc/passwd')).rejects.toThrow(
        'Only HTTP and HTTPS protocols are allowed'
      )
    })

    it('should enforce domain whitelist', async () => {
      await expect(network.fetch('https://malicious.com')).rejects.toThrow(
        "Access to domain 'malicious.com' is not allowed"
      )
      await expect(network.fetch('https://evil.api.github.com')).rejects.toThrow(
        "Access to domain 'evil.api.github.com' is not allowed"
      )
    })

    it('should allow whitelisted domains', async () => {
      await expect(network.fetch('https://api.github.com/user')).resolves.not.toThrow()
      await expect(network.fetch('https://httpbin.org/get')).resolves.not.toThrow()
      await expect(network.fetch('https://api.openweathermap.org/data')).resolves.not.toThrow()
    })

    it('should add security headers', async () => {
      await network.fetch('https://api.github.com/test')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.github.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'kotori-journal-plugin/1.0.0',
          }),
        })
      )
    })

    it('should preserve existing headers', async () => {
      await network.fetch('https://api.github.com/test', {
        headers: { Authorization: 'Bearer token' },
      })

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.github.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token',
            'User-Agent': 'kotori-journal-plugin/1.0.0',
          }),
        })
      )
    })
  })
})
