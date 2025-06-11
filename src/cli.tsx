#!/usr/bin/env node
import React from 'react'
import { render } from 'ink'
import { App } from './components/App'
import { getConfig } from './utils/config'

const config = getConfig()

render(<App config={config} />)