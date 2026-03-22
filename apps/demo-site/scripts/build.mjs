// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appsRoot = join(__dirname, '..', '..')
const demoWeb = join(appsRoot, 'demo-web')
const demoReader = join(appsRoot, 'demo-reader')
const outDir = join(__dirname, '..', 'dist')

const demoOrigin = process.env.DEMO_SITE_ORIGIN ?? 'https://demo.etapsky.com'

const envProducer = {
  ...process.env,
  VITE_BASE_PATH: '/producer/',
  VITE_DEMO_READER_URL: `${demoOrigin.replace(/\/$/, '')}/reader/`,
}

const envReader = {
  ...process.env,
  VITE_BASE_PATH: '/reader/',
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

execSync('bun run build', { cwd: demoWeb, stdio: 'inherit', env: envProducer })
execSync('bun run build', { cwd: demoReader, stdio: 'inherit', env: envReader })

cpSync(join(demoWeb, 'dist'), join(outDir, 'producer'), { recursive: true })
cpSync(join(demoReader, 'dist'), join(outDir, 'reader'), { recursive: true })
cpSync(join(__dirname, '..', 'public', 'index.html'), join(outDir, 'index.html'))
