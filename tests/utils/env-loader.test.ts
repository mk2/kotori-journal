import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import { loadEnvironmentVariables } from '../../src/utils/env-loader'

// fs.readFileSync をモック
vi.mock('fs')
const mockedFs = vi.mocked(fs)

// os.homedir をモック
vi.mock('os')
const mockedOs = vi.mocked(os)

describe('loadEnvironmentVariables', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // process.envをクリーンアップ
    delete process.env.TEST_VAR
    delete process.env.KOTORI_TEST_VAR
    delete process.env.ANOTHER_VAR
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should load variables from .env file', () => {
    const envContent = `
TEST_VAR=test_value
KOTORI_TEST_VAR=kotori_value
# This is a comment
ANOTHER_VAR=another_value
`
    mockedFs.existsSync.mockImplementation(filePath => {
      return filePath === '.env'
    })
    mockedFs.readFileSync.mockImplementation(filePath => {
      if (filePath === '.env') {
        return envContent
      }
      throw new Error('File not found')
    })
    mockedOs.homedir.mockReturnValue('/home/user')

    loadEnvironmentVariables()

    expect(process.env.TEST_VAR).toBe('test_value')
    expect(process.env.KOTORI_TEST_VAR).toBe('kotori_value')
    expect(process.env.ANOTHER_VAR).toBe('another_value')
  })

  it('should load variables from .kotori-journal file in home directory', () => {
    const kotoriContent = `
KOTORI_API_KEY=secret_key
KOTORI_DEBUG=true
HOME_VAR=home_value
`
    mockedFs.existsSync.mockImplementation(filePath => {
      return filePath === '/home/user/.kotori-journal'
    })
    mockedFs.readFileSync.mockImplementation(filePath => {
      if (filePath === '/home/user/.kotori-journal') {
        return kotoriContent
      }
      throw new Error('File not found')
    })
    mockedOs.homedir.mockReturnValue('/home/user')

    loadEnvironmentVariables()

    expect(process.env.KOTORI_API_KEY).toBe('secret_key')
    expect(process.env.KOTORI_DEBUG).toBe('true')
    expect(process.env.HOME_VAR).toBe('home_value')
  })

  it('should load variables from both .env and .kotori-journal files', () => {
    const envContent = `TEST_VAR=env_value`
    const kotoriContent = `KOTORI_VAR=kotori_value`

    mockedFs.existsSync.mockImplementation(filePath => {
      return filePath === '.env' || filePath === '/home/user/.kotori-journal'
    })
    mockedFs.readFileSync.mockImplementation(filePath => {
      if (filePath === '.env') {
        return envContent
      }
      if (filePath === '/home/user/.kotori-journal') {
        return kotoriContent
      }
      throw new Error('File not found')
    })
    mockedOs.homedir.mockReturnValue('/home/user')

    loadEnvironmentVariables()

    expect(process.env.TEST_VAR).toBe('env_value')
    expect(process.env.KOTORI_VAR).toBe('kotori_value')
  })

  it('should handle .kotori-journal variables overriding .env variables', () => {
    const envContent = `SAME_VAR=env_value`
    const kotoriContent = `SAME_VAR=kotori_value`

    mockedFs.existsSync.mockImplementation(filePath => {
      return filePath === '.env' || filePath === '/home/user/.kotori-journal'
    })
    mockedFs.readFileSync.mockImplementation(filePath => {
      if (filePath === '.env') {
        return envContent
      }
      if (filePath === '/home/user/.kotori-journal') {
        return kotoriContent
      }
      throw new Error('File not found')
    })
    mockedOs.homedir.mockReturnValue('/home/user')

    loadEnvironmentVariables()

    expect(process.env.SAME_VAR).toBe('kotori_value')
  })

  it('should handle files that do not exist gracefully', () => {
    mockedFs.existsSync.mockReturnValue(false)
    mockedOs.homedir.mockReturnValue('/home/user')

    expect(() => loadEnvironmentVariables()).not.toThrow()
  })

  it('should handle malformed environment files gracefully', () => {
    const malformedContent = `
VALID_VAR=valid_value
INVALID_LINE_WITHOUT_EQUALS
=INVALID_EQUALS_AT_START
ANOTHER_VALID=another_value
`
    mockedFs.existsSync.mockImplementation(filePath => {
      return filePath === '.env'
    })
    mockedFs.readFileSync.mockImplementation(filePath => {
      if (filePath === '.env') {
        return malformedContent
      }
      throw new Error('File not found')
    })
    mockedOs.homedir.mockReturnValue('/home/user')

    expect(() => loadEnvironmentVariables()).not.toThrow()
    expect(process.env.VALID_VAR).toBe('valid_value')
    expect(process.env.ANOTHER_VALID).toBe('another_value')
  })

  it('should handle quoted values correctly', () => {
    const envContent = `
QUOTED_VAR="quoted value"
SINGLE_QUOTED='single quoted'
MIXED_VAR="value with 'single' quotes"
`
    mockedFs.existsSync.mockImplementation(filePath => {
      return filePath === '.env'
    })
    mockedFs.readFileSync.mockImplementation(filePath => {
      if (filePath === '.env') {
        return envContent
      }
      throw new Error('File not found')
    })
    mockedOs.homedir.mockReturnValue('/home/user')

    loadEnvironmentVariables()

    expect(process.env.QUOTED_VAR).toBe('quoted value')
    expect(process.env.SINGLE_QUOTED).toBe('single quoted')
    expect(process.env.MIXED_VAR).toBe("value with 'single' quotes")
  })
})
