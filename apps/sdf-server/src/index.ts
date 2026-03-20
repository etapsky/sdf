// ─── @etapsky/sdf-server ─────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
//
// SDF REST API server — Fastify + BullMQ + S3/MinIO + PostgreSQL + ERP Connectors
// Startup sequence: Redis → ERP connectors → BullMQ workers → Fastify

import { buildServer, startWorkers, registerConnectors, connectDb } from '@etapsky/sdf-server-core'
import { redis }         from '@etapsky/sdf-server-core/queue'
import { env }           from '@etapsky/sdf-server-core/config'

async function main() {
  console.log(`Starting @etapsky/sdf-server (${env.NODE_ENV})`)

  // Connect Redis
  await redis.connect()
  console.log('✓ Redis connected')

  // Connect PostgreSQL
  await connectDb()
  console.log('✓ PostgreSQL connected')

  // Register connectors
  await registerConnectors()
  console.log('✓ Connectors registered')

  // Start BullMQ workers
  startWorkers()

  // Build and start Fastify
  const server = await buildServer()

  try {
    await server.listen({ port: env.PORT, host: env.HOST })
    console.log(`✓ Server listening on ${env.HOST}:${env.PORT}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully`)
    await server.close()
    await redis.quit()
    console.log('✓ Server closed')
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
}

main().catch((err) => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})