// ─── ERP Connector Routes ─────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Per-tenant ERP integration endpoints. Each tenant configures its own connector
// (SAP, Oracle, etc.) which is stored in-memory in the ConnectorRegistry.
//
// POST   /v1/connectors/configure       Configure ERP connector for tenant
// GET    /v1/connectors/health          Health check active connector
// POST   /v1/connectors/match           Match a nomination_ref against ERP
// GET    /v1/sdf/:id/erp-status         Query ERP document status
// POST   /v1/sdf/:id/push-to-erp        Push an uploaded document to ERP

import type { FastifyInstance } from 'fastify'
import { z }                    from 'zod'
import { connectorRegistry }    from '../connectors/index.js'
import { db, writeAudit }       from '../db/client.js'
import { sdfDocuments }         from '../db/schema.js'
import { s3 }                   from '../storage/s3.js'
import { parseSDF }             from '@etapsky/sdf-kit/reader'
import { authMiddleware }        from '../middleware/auth.js'
import { eq, and }              from 'drizzle-orm'
import type { ERPConnectorConfig } from '../connectors/base/types.js'

const ConfigureSchema = z.object({
  type:     z.enum(['SAP', 'Oracle', 'NetSuite', 'Dynamics', 'Custom']),
  baseUrl:  z.string().url(),
  auth:     z.discriminatedUnion('type', [
    z.object({ type: z.literal('basic'),   username: z.string(), password: z.string() }),
    z.object({ type: z.literal('bearer'),  token: z.string() }),
    z.object({ type: z.literal('oauth2'),  clientId: z.string(), clientSecret: z.string(), tokenUrl: z.string().url() }),
    z.object({ type: z.literal('api_key'), header: z.string(), key: z.string() }),
  ]),
  timeoutMs:     z.number().int().min(1000).max(120_000).optional(),
  debug:         z.boolean().optional(),
  fieldMappings: z.record(z.string()).optional(),
})

export async function connectorRoutes(fastify: FastifyInstance): Promise<void> {

  // ── POST /connectors/configure ────────────────────────────────────────────
  fastify.post('/connectors/configure', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const body = ConfigureSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ error: 'BAD_REQUEST', issues: body.error.issues })
    }

    try {
      const connector = connectorRegistry.configure(
        request.tenant.id,
        body.data as ERPConnectorConfig,
      )

      // Quick health check
      const health = await connector.healthCheck()

      await writeAudit({
        tenantId:   request.tenant.id,
        action:     'upload', // reuse — no dedicated connector action yet
        actor:      request.tenant.name,
        ip:         request.ip,
        statusCode: 200,
        metadata:   { connector_type: body.data.type, connected: health.connected },
      })

      return reply.send({
        configured:   true,
        type:         body.data.type,
        health,
      })
    } catch (err) {
      return reply.code(400).send({ error: 'CONNECTOR_ERROR', message: String(err) })
    }
  })

  // ── GET /connectors/health ────────────────────────────────────────────────
  fastify.get('/connectors/health', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const connector = connectorRegistry.get(request.tenant.id)
    if (!connector) {
      return reply.code(404).send({ error: 'NOT_CONFIGURED', message: 'No ERP connector configured for this tenant' })
    }

    const health = await connector.healthCheck()
    return reply.send(health)
  })

  // ── POST /connectors/match ────────────────────────────────────────────────
  fastify.post('/connectors/match', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { nomination_ref } = request.body as { nomination_ref?: string }
    if (!nomination_ref) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'nomination_ref is required' })
    }

    const connector = connectorRegistry.get(request.tenant.id)
    if (!connector) {
      return reply.code(404).send({ error: 'NOT_CONFIGURED', message: 'No ERP connector configured' })
    }

    const result = await connector.matchNomination(nomination_ref)
    return reply.send(result)
  })

  // ── GET /sdf/:id/erp-status ───────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>('/sdf/:id/erp-status', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const connector = connectorRegistry.get(request.tenant.id)
    if (!connector) {
      return reply.code(404).send({ error: 'NOT_CONFIGURED', message: 'No ERP connector configured' })
    }

    const [doc] = await db
      .select()
      .from(sdfDocuments)
      .where(and(eq(sdfDocuments.id, request.params.id), eq(sdfDocuments.tenantId, request.tenant.id)))
      .limit(1)

    if (!doc) return reply.code(404).send({ error: 'NOT_FOUND' })

    // Get ERP ref from document metadata
    // In production, the ERP ref would be stored in sdf_documents after pushDocument()
    // For now, use document_id as fallback reference
    const erpRef = doc.documentId

    const status = await connector.queryStatus(erpRef)
    return reply.send(status)
  })

  // ── POST /sdf/:id/push-to-erp ─────────────────────────────────────────────
  // Manually trigger ERP push for an already-uploaded document
  fastify.post<{ Params: { id: string } }>('/sdf/:id/push-to-erp', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const connector = connectorRegistry.get(request.tenant.id)
    if (!connector) {
      return reply.code(404).send({ error: 'NOT_CONFIGURED', message: 'No ERP connector configured' })
    }

    const [doc] = await db
      .select()
      .from(sdfDocuments)
      .where(and(eq(sdfDocuments.id, request.params.id), eq(sdfDocuments.tenantId, request.tenant.id)))
      .limit(1)

    if (!doc) return reply.code(404).send({ error: 'NOT_FOUND' })

    const { body } = await s3.download(doc.s3Key)
    const parsed   = await parseSDF(new Uint8Array(body))

    const result = await connector.pushDocument(
      parsed.data,
      parsed.meta,
      doc.documentType ?? 'unknown',
    )

    await writeAudit({
      documentId: doc.id,
      tenantId:   request.tenant.id,
      action:     'upload',
      actor:      request.tenant.name,
      ip:         request.ip,
      statusCode: result.success ? 200 : 500,
      metadata:   { erp_system: result.erpSystem, erp_ref: result.erpRef, success: result.success },
    })

    return reply.code(result.success ? 200 : 500).send(result)
  })
}
