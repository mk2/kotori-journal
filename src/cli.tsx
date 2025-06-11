#!/usr/bin/env node
import dotenv from 'dotenv'
import React from 'react'
import { render } from 'ink'
import { App } from './components/App'
import { getConfig } from './utils/config'

// .envファイルから環境変数を読み込み
dotenv.config()

const config = getConfig()

render(<App config={config} />)