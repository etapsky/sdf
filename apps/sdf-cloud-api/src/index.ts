// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
/**
 * @etapsky/sdf-cloud-api — Hosted SDF SaaS (api.etapsky.com)
 * Extends sdf-server with billing, onboarding, multi-tenant self-service.
 */

import { buildServer } from '@etapsky/sdf-server/server'
import { redis } from '@etapsky/sdf-server/queue/client'
import { startWorkers } from '@etapsky/sdf-server/queue/jobs'
import { registerConnectors } from '@etapsky/sdf-server/connectors'
import { env } from '@etapsky/sdf-server/config/env'
import { billingRoutes } from './routes/billing.js'
import { onboardingRoutes } from './routes/onboarding.js'

async function main() {
  console.log(`Starting @etapsky/sdf-cloud-api (${env.NODE_ENV})`)

  await redis.connect()
  console.log('✓ Redis connected')

  await registerConnectors()
  console.log('✓ Connectors registered')

  startWorkers()

  const server = await buildServer({
    registerExtraRoutes: async (fastify) => {
      await fastify.register(onboardingRoutes, { prefix: '/v1/auth' })
      await fastify.register(billingRoutes, { prefix: '/v1/billing' })
    },
  })

  try {
    await server.listen({ port: env.PORT, host: env.HOST })
    console.log(`✓ Server listening on ${env.HOST}:${env.PORT}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down`)
    await server.close()
    await redis.quit()
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
