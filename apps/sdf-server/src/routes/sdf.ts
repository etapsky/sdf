// ─── SDF Document Routes ──────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
//
// POST   /sdf/upload          Upload + validate a .sdf file
// GET    /sdf/:id             Download the .sdf file
// GET    /sdf/:id/meta        Return meta.json as JSON
// GET    /sdf/:id/data        Return data.json as JSON
// DELETE /sdf/:id             Delete a .sdf file
// GET    /sdf                 List documents for the tenant

import type { FastifyInstance } from 'fastify'
import { z }                    from 'zod'
import { parseSDF }             from '@etapsky/sdf-kit/reader'
import { db, writeAudit }       from '../db/client.js'
import { sdfDocuments }         from '../db/schema.js'
import { s3, S3Client }        from '../storage/s3.js'
import { validateQueue, webhookQueue } from '../queue/jobs.js'
import { authMiddleware }        from '../middleware/auth.js'
import { eq, and, desc }        from 'drizzle-orm'

export async function sdfRoutes(fastify: FastifyInstance): Promise<void> {

  // ── POST /sdf/upload ───────────────────────────────────────────────────────
  fastify.post('/sdf/upload', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const data = await request.file()

    if (!data) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'No file provided' })
    }

    if (!data.filename.endsWith('.sdf')) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Only .sdf files are accepted' })
    }

    // Read multipart body into buffer
    const chunks: Buffer[] = []
    for await (const chunk of data.file) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)

    // Parse and validate
    let parsed: Awaited<ReturnType<typeof parseSDF>>
    try {
      parsed = await parseSDF(new Uint8Array(buffer))
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string }
      return reply.code(422).send({
        error:   e.code ?? 'INVALID_SDF',
        message: e.message ?? 'Invalid SDF file',
      })
    }

    const { meta } = parsed
    const s3Key    = S3Client.buildKey(request.tenant.id, meta.document_id)

    // Upload to S3
    await s3.upload(s3Key, new Uint8Array(buffer))

    // Insert into DB
    const [doc] = await db.insert(sdfDocuments).values({
      documentId:    meta.document_id,
      tenantId:      request.tenant.id,
      issuer:        meta.issuer,
      issuerId:      meta.issuer_id,
      recipient:     meta.recipient,
      recipientId:   meta.recipient_id,
      documentType:  meta.document_type,
      sdfVersion:    meta.sdf_version,
      schemaId:      meta.schema_id,
      s3Key,
      sizeBytes:     buffer.length,
      signed:        !!meta.signature_algorithm,
      signatureAlgorithm: meta.signature_algorithm ?? null,
      tags:          meta.tags ?? [],
    }).returning()

    // Enqueue validation job
    await validateQueue.add('validate-sdf', {
      documentDbId: doc.id,
      s3Key,
      tenantId:     request.tenant.id,
      actor:        request.tenant.name,
      ip:           request.ip,
    })

    await writeAudit({
      documentId: doc.id,
      tenantId:   request.tenant.id,
      action:     'upload',
      actor:      request.tenant.name,
      ip:         request.ip,
      userAgent:  request.headers['user-agent'],
      statusCode: 201,
      metadata:   { document_type: meta.document_type, sdf_version: meta.sdf_version },
    })

    // Webhook notification
    if (request.tenant.webhookUrl) {
      await webhookQueue.add('webhook-delivery', {
        webhookUrl:    request.tenant.webhookUrl,
        webhookSecret: request.tenant.webhookSecret ?? '',
        event:         'sdf.uploaded',
        payload:       { document_id: meta.document_id, document_type: meta.document_type },
        tenantId:      request.tenant.id,
        attempt:       1,
      })
    }

    return reply.code(201).send({
      id:            doc.id,
      document_id:   meta.document_id,
      document_type: meta.document_type,
      sdf_version:   meta.sdf_version,
      issuer:        meta.issuer,
      size_bytes:    buffer.length,
      created_at:    doc.createdAt,
    })
  })

  // ── GET /sdf/:id — download ────────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>('/sdf/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const doc = await getDocument(request.params.id, request.tenant.id)
    if (!doc) return reply.code(404).send({ error: 'NOT_FOUND' })

    const { body } = await s3.download(doc.s3Key)

    await writeAudit({
      documentId: doc.id,
      tenantId:   request.tenant.id,
      action:     'download',
      actor:      request.tenant.name,
      ip:         request.ip,
      statusCode: 200,
    })

    return reply
      .header('Content-Type', 'application/vnd.sdf')
      .header('Content-Disposition', `attachment; filename="${doc.documentId}.sdf"`)
      .header('Content-Length', body.length)
      .send(Buffer.from(body))
  })

  // ── GET /sdf/:id/meta ──────────────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>('/sdf/:id/meta', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const doc = await getDocument(request.params.id, request.tenant.id)
    if (!doc) return reply.code(404).send({ error: 'NOT_FOUND' })

    const { body } = await s3.download(doc.s3Key)
    const parsed   = await parseSDF(new Uint8Array(body))

    return reply.send(parsed.meta)
  })

  // ── GET /sdf/:id/data ──────────────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>('/sdf/:id/data', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const doc = await getDocument(request.params.id, request.tenant.id)
    if (!doc) return reply.code(404).send({ error: 'NOT_FOUND' })

    const { body } = await s3.download(doc.s3Key)
    const parsed   = await parseSDF(new Uint8Array(body))

    return reply.send(parsed.data)
  })

  // ── DELETE /sdf/:id ────────────────────────────────────────────────────────
  fastify.delete<{ Params: { id: string } }>('/sdf/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const doc = await getDocument(request.params.id, request.tenant.id)
    if (!doc) return reply.code(404).send({ error: 'NOT_FOUND' })

    await s3.delete(doc.s3Key)
    await db.delete(sdfDocuments).where(eq(sdfDocuments.id, doc.id))

    await writeAudit({
      documentId: doc.id,
      tenantId:   request.tenant.id,
      action:     'delete',
      actor:      request.tenant.name,
      ip:         request.ip,
      statusCode: 200,
    })

    return reply.send({ deleted: true, id: doc.id })
  })

  // ── GET /sdf — list ────────────────────────────────────────────────────────
  fastify.get('/sdf', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const docs = await db
      .select()
      .from(sdfDocuments)
      .where(eq(sdfDocuments.tenantId, request.tenant.id))
      .orderBy(desc(sdfDocuments.createdAt))
      .limit(100)

    return reply.send({ documents: docs, total: docs.length })
  })
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getDocument(id: string, tenantId: string) {
  const [doc] = await db
    .select()
    .from(sdfDocuments)
    .where(and(
      eq(sdfDocuments.id, tenantId),
      eq(sdfDocuments.tenantId, tenantId),
    ))
    .limit(1)
  return doc ?? null
}