import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ServerCommand } from './server-command.js'
import { Config } from '../utils/config.js'
import fs from 'fs/promises'
import path from 'path'

vi.mock('fs/promises')
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    pid: 12345,
    unref: vi.fn(),
  })),
}))

describe('ServerCommand', () => {
  let serverCommand: ServerCommand
  let config: Config
  const mockPidFile = '/tmp/test-data-path/server.pid'
  const mockConfigFile = '/tmp/test-data-path/server.json'

  beforeEach(() => {
    config = {
      dataPath: '/tmp/test-data-path',
      defaultCategories: ['仕事', 'プライベート'],
      aiTrigger: '@ai',
    }
    serverCommand = new ServerCommand(config)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('start command', () => {
    it('should start the server with default settings', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'))
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue()

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await serverCommand.execute(['start'])

      expect(vi.mocked(fs.mkdir)).toHaveBeenCalledWith(path.dirname(mockPidFile), {
        recursive: true,
      })
      expect(vi.mocked(fs.writeFile)).toHaveBeenCalledWith(mockPidFile, expect.any(String))
      expect(vi.mocked(fs.writeFile)).toHaveBeenCalledWith(mockConfigFile, expect.any(String))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Server started'))

      consoleSpy.mockRestore()
    })

    it('should not start if server is already running', async () => {
      vi.mocked(fs.access).mockResolvedValue()
      vi.mocked(fs.readFile).mockResolvedValue('12345')
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true)

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      try {
        await serverCommand.execute(['start'])
      } catch (error: any) {
        expect(error.message).toBe('Server is already running')
      }

      killSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })

    it('should accept custom port', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'))
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue()

      await serverCommand.execute(['start', '--port', '9000'])

      const configCall = vi.mocked(fs.writeFile).mock.calls.find(call => call[0] === mockConfigFile)
      expect(configCall).toBeDefined()
      const savedConfig = JSON.parse(configCall![1] as string)
      expect(savedConfig.port).toBe(9000)
    })
  })

  describe('stop command', () => {
    it('should stop a running server', async () => {
      vi.mocked(fs.access).mockResolvedValue()
      vi.mocked(fs.readFile).mockResolvedValue('12345')
      vi.mocked(fs.unlink).mockResolvedValue()

      // Mock process.kill
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true)
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await serverCommand.execute(['stop'])

      expect(killSpy).toHaveBeenCalledWith(12345, 'SIGTERM')
      expect(vi.mocked(fs.unlink)).toHaveBeenCalledWith(mockPidFile)
      expect(vi.mocked(fs.unlink)).toHaveBeenCalledWith(mockConfigFile)
      expect(consoleSpy).toHaveBeenCalledWith('Server stopped')

      killSpy.mockRestore()
      consoleSpy.mockRestore()
    })

    it('should handle when server is not running', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'))

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await serverCommand.execute(['stop'])

      expect(consoleSpy).toHaveBeenCalledWith('Server is not running')

      consoleSpy.mockRestore()
    })
  })

  describe('status command', () => {
    it('should show status when server is running', async () => {
      vi.mocked(fs.access).mockResolvedValue()
      const configData = JSON.stringify({
        port: 8765,
        authToken: 'test-token',
        startedAt: new Date().toISOString(),
      })

      vi.mocked(fs.readFile).mockImplementation(file => {
        if (file.toString().endsWith('.pid')) {
          return Promise.resolve('12345')
        } else if (file.toString().endsWith('.json')) {
          return Promise.resolve(configData)
        }
        return Promise.reject(new Error('Unknown file'))
      })

      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true)
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await serverCommand.execute(['status'])

      expect(killSpy).toHaveBeenCalledWith(12345, 0)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Server is running'))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Port: 8765'))

      killSpy.mockRestore()
      consoleSpy.mockRestore()
    })

    it('should show status when server is not running', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'))

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await serverCommand.execute(['status'])

      expect(consoleSpy).toHaveBeenCalledWith('Server is not running')

      consoleSpy.mockRestore()
    })
  })

  describe('invalid command', () => {
    it('should show help for invalid command', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await serverCommand.execute(['invalid'])

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'))

      consoleSpy.mockRestore()
    })
  })
})
