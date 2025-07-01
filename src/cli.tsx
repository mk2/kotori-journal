#!/usr/bin/env node
import React from 'react'
import { render } from 'ink'
import { App } from './components/App.js'
import { getConfig } from './utils/config.js'
import { ServerCommand } from './commands/server-command.js'
import { loadEnvironmentVariables } from './utils/env-loader.js'

// .envファイルと.kotori-journalファイルから環境変数を読み込み
loadEnvironmentVariables()

const config = getConfig()

// Parse command line arguments
const args = process.argv.slice(2)

if (args[0] === 'server') {
  // Handle server commands
  const serverCommand = new ServerCommand(config)
  serverCommand.execute(args.slice(1)).catch(error => {
    // eslint-disable-next-line no-console
    console.error('Error:', error.message)
    process.exit(1)
  })
} else {
  // Launch interactive journal app
  render(<App config={config} />)
}
