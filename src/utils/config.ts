import * as path from 'path'
import * as os from 'os'

export interface Config {
  dataPath: string
  defaultCategories: string[]
  aiTrigger: string
  serverPort?: number
  serverAuthToken?: string
}

export const defaultConfig: Config = {
  dataPath: path.join(os.homedir(), '.kotori-journal-data'),
  defaultCategories: ['仕事', 'プライベート'],
  aiTrigger: '@ai',
}

export function getConfig(): Config {
  const serverPort = process.env.KOTORI_SERVER_PORT
    ? parseInt(process.env.KOTORI_SERVER_PORT, 10)
    : 8765
  const serverAuthToken = process.env.KOTORI_SERVER_AUTH_TOKEN

  return {
    ...defaultConfig,
    dataPath: process.env.KOTORI_DATA_PATH || defaultConfig.dataPath,
    serverPort,
    serverAuthToken,
  }
}
