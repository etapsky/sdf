// ─── Schema Routes ────────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Exposes the @etapsky/sdf-schema-registry over HTTP.
//
// GET /schemas                  List all registered schemas
// GET /schemas/:type            List versions for a document type
// GET /schemas/:type/:version   Retrieve a specific schema (meta + JSON Schema)

import type { FastifyInstance } from 'fastify'
import { SchemaRegistry }       from '@etapsky/sdf-schema-registry/registry'
import { authMiddleware }        from '../middleware/auth.js'

// Registry is populated at startup from spec/schemas/
// In production, schemas are loaded from the canonical URL or a DB table
const registry = new SchemaRegistry({ allowRemote: true })

export async function schemaRoutes(fastify: FastifyInstance): Promise<void> {

  // ── GET /schemas ───────────────────────────────────────────────────────────
  fastify.get('/schemas', {
    preHandler: [authMiddleware],
  }, async (_request, reply) => {
    const result = registry.list()
    return reply.send(result)
  })

  // ── GET /schemas/:type ─────────────────────────────────────────────────────
  fastify.get<{ Params: { type: string } }>('/schemas/:type', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const versions = registry.versions(request.params.type)
    if (versions.length === 0) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: `No schemas for type: ${request.params.type}` })
    }
    return reply.send({ document_type: request.params.type, versions })
  })

  // ── GET /schemas/:type/:version ────────────────────────────────────────────
  fastify.get<{ Params: { type: string; version: string } }>('/schemas/:type/:version', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { type, version } = request.params
    const entry = registry.resolveVersion(type, version)
    if (!entry) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: `Schema not found: ${type} v${version}` })
    }
    return reply.send({ meta: entry.meta, schema: entry.schema })
  })
}

export { registry }