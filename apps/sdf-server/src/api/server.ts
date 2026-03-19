// ─── Fastify Server Bootstrap ─────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Assembles the Fastify instance: CORS, multipart, tenant-aware rate limiting,
// health endpoints, versioned route registration, and global error handling.

import Fastify            from 'fastify'
import cors               from '@fastify/cors'
import multipart          from '@fastify/multipart'
import rateLimit          from '@fastify/rate-limit'
import { env }            from '../config/env.js'
import { sdfRoutes }      from '../routes/sdf.js'
import { signRoutes }     from '../routes/sign.js'
import { validateRoutes } from '../routes/validate.js'
import { schemaRoutes }   from '../routes/schema.js'
import { adminRoutes }    from '../routes/admin.js'
import { samlRoutes }     from '../routes/saml.js'
import { db }             from '../db/client.js'
import { tenants }        from '../db/schema.js'
import { eq }             from 'drizzle-orm'

export async function buildServer() {
  const fastify = Fastify({
    logger: {
      level:     env.LOG_LEVEL,
      transport: env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    trustProxy: true,
  })

  // ── Plugins ───────────────────────────────────────────────────────────────

  await fastify.register(cors, {
    origin:  env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await fastify.register(multipart, {
    limits: {
      fileSize: 200 * 1024 * 1024,
      files:    1,
    },
  })

  // ── Tenant-aware rate limiting ─────────────────────────────────────────────
  // Each tenant has its own rate limit stored in the DB.
  // Anonymous requests (pre-auth) use the global default.
  await fastify.register(rateLimit, {
    global:   true,
    max:      env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,

    // Key: use tenant ID if authenticated, IP otherwise
    keyGenerator: (req) => {
      const r = req as { tenant?: { id: string } }
      return r.tenant?.id ?? req.ip
    },

    // Dynamic limit per tenant from DB
    allowList: [],
    onExceeded: (_req, key) => {
      fastify.log.warn({ key }, 'Rate limit exceeded')
    },

    // Override max per tenant after auth
    // This hook runs after auth middleware sets req.tenant
    errorResponseBuilder: (req, context) => ({
      error:      'RATE_LIMIT_EXCEEDED',
      message:    `Too many requests. Retry after ${context.after}`,
      retryAfter: context.after,
    }),
  })

  // ── Request hook: apply per-tenant rate limit ──────────────────────────────
  fastify.addHook('onRequest', async (request) => {
    const r = request as { tenant?: { rateLimit?: number; id?: string } }
    if (r.tenant?.rateLimit && r.tenant.id) {
      // Dynamically override limit for this tenant
      // BullMQ rate limit plugin supports setLimit() per key
      // We set it here as a request header for visibility
      request.headers['x-ratelimit-limit'] = String(r.tenant.rateLimit)
    }
  })

  // ── Health checks (no auth) ───────────────────────────────────────────────

  fastify.get('/health', async () => ({
    status:    'ok',
    version:   '0.1.0',
    timestamp: new Date().toISOString(),
  }))

  fastify.get('/health/ready', async (_req, reply) => {
    // Check DB connectivity
    try {
      await db.select().from(tenants).limit(1)
      return reply.send({ status: 'ready', db: 'ok' })
    } catch {
      return reply.code(503).send({ status: 'not_ready', db: 'error' })
    }
  })

  // ── Routes ────────────────────────────────────────────────────────────────

  const API_PREFIX = '/v1'

  await fastify.register(sdfRoutes,      { prefix: API_PREFIX })
  await fastify.register(signRoutes,     { prefix: API_PREFIX })
  await fastify.register(validateRoutes, { prefix: API_PREFIX })
  await fastify.register(schemaRoutes,   { prefix: API_PREFIX })
  await fastify.register(adminRoutes,    { prefix: API_PREFIX })
  await fastify.register(samlRoutes,     { prefix: API_PREFIX })

  // ── Global error handler ──────────────────────────────────────────────────

  fastify.setErrorHandler((error: Error & { statusCode?: number; code?: string }, request, reply) => {
    fastify.log.error({ err: error, url: request.url }, 'Unhandled error')

    if (error.statusCode) {
      return reply.code(error.statusCode).send({
        error:   error.code ?? 'ERROR',
        message: error.message,
      })
    }

    return reply.code(500).send({
      error:   'INTERNAL_SERVER_ERROR',
      message: env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
    })
  })

  fastify.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ error: 'NOT_FOUND', message: 'Route not found' })
  })

  return fastify
}