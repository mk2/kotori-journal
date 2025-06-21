export interface Config {
  readonly dataPath: string
  readonly pluginsPath: string
  readonly anthropicApiKey?: string
  readonly [key: string]: unknown
}
