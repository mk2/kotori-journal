import React from 'react'
import { Command } from './command'
import { JournalEntry } from './journal'
import { Config } from './config'

export interface Plugin {
  name: string
  version: string
  description: string
  author: string
  commands?: Command[]
  hooks?: PluginHooks
  uiComponents?: UIComponent[]
  initialize(context: PluginContext): Promise<void>
  dispose?(): Promise<void>
}

export interface PluginContext {
  config: Config
  dataPath: string
  storage: RestrictedStorage
  network: RestrictedNetwork
  logger: Logger
}

export interface PluginHooks {
  beforeSave?: (entry: JournalEntry) => Promise<JournalEntry>
  afterSave?: (entry: JournalEntry) => Promise<void>
  beforeSearch?: (query: string) => Promise<string>
  afterSearch?: (results: JournalEntry[]) => Promise<JournalEntry[]>
}

export interface UIComponent {
  name: string
  component: React.ComponentType<unknown>
}

export interface RestrictedStorage {
  read(key: string): Promise<string | null>
  write(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
  list(): Promise<string[]>
}

export interface RestrictedNetwork {
  fetch(url: string, options?: Record<string, unknown>): Promise<unknown>
}

export interface Logger {
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
  debug(message: string, ...args: unknown[]): void
}

export interface PluginSource {
  type: 'npm' | 'local' | 'git'
  identifier: string
  version?: string
  path?: string
  repository?: string
  branch?: string
}

export interface PluginConfig {
  type: 'npm' | 'local' | 'git'
  package?: string
  version?: string
  enabled: boolean
  installPath: string
  installedAt: string
  sourcePath?: string
  repository?: string
  branch?: string
}
