import * as path from 'path'
import * as os from 'os'

export interface Config {
  dataPath: string
  defaultCategories: string[]
  aiTrigger: string
}

export const defaultConfig: Config = {
  dataPath: path.join(os.homedir(), '.kotori-journal-data'),
  defaultCategories: ['仕事', 'プライベート'],
  aiTrigger: '@ai',
}

export function getConfig(): Config {
  return {
    ...defaultConfig,
    dataPath: process.env.KOTORI_DATA_PATH || defaultConfig.dataPath,
  }
}
