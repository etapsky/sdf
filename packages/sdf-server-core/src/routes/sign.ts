// ─── Sign / Verify Routes ─────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
//
// POST /sdf/:id/sign     Enqueue an async signing job (202 Accepted)
// POST /sdf/:id/verify   Verify an existing signature synchronously (200/400)

import type { FastifyInstance } from 'fastify'
import { z }                    from 'zod'
import { parseSDF }             from '@etapsky/sdf-kit/reader'
import { verifySig, importSDFPublicKey } from '@etapsky/sdf-kit/signer'
import { db, writeAudit }       from '../db/client.js'
import { sdfDocuments }         from '../db/schema.js'
import { s3 }                   from '../storage/s3.js'
import { signQueue }            from '../queue/jobs.js'
import { authMiddleware }        from '../middleware/auth.js'
import { eq, and }              from 'drizzle-orm'

const SignBodySchema = z.object({
  private_key: z.string().min(1).describe('Base64-encoded PKCS#8 private key'),
  algorithm:   z.enum(['ECDSA', 'RSASSA-PKCS1-v1_5']).default('ECDSA'),
  include_pdf: z.boolean().default(false),
})

const VerifyBodySchema = z.object({
  public_key: z.string().min(1).describe('Base64-encoded SPKI public key'),
  algorithm:  z.enum(['ECDSA', 'RSASSA-PKCS1-v1_5']).default('ECDSA'),
})

export async function signRoutes(fastify: FastifyInstance): Promise<void> {

  // ── POST /sdf/:id/sign ────────────────────────────────────────────────────
  fastify.post<{ Params: { id: string } }>('/sdf/:id/sign', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const body = SignBodySchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ error: 'BAD_REQUEST', issues: body.error.issues })
    }

    const [doc] = await db
      .select()
      .from(sdfDocuments)
      .where(and(eq(sdfDocuments.id, request.params.id), eq(sdfDocuments.tenantId, request.tenant.id)))
      .limit(1)

    if (!doc) return reply.code(404).send({ error: 'NOT_FOUND' })
    if (doc.signed) return reply.code(409).send({ error: 'ALREADY_SIGNED', message: 'Document is already signed' })

    const job = await signQueue.add('sign-sdf', {
      documentDbId:  doc.id,
      s3Key:         doc.s3Key,
      tenantId:      request.tenant.id,
      privateKeyB64: body.data.private_key,
      algorithm:     body.data.algorithm,
      includePDF:    body.data.include_pdf,
      actor:         request.tenant.name,
      ip:            request.ip,
    })

    return reply.code(202).send({
      accepted:  true,
      job_id:    job.id,
      message:   'Signing job queued — poll GET /sdf/:id to check signed status',
    })
  })

  // ── POST /sdf/:id/verify ──────────────────────────────────────────────────
  fastify.post<{ Params: { id: string } }>('/sdf/:id/verify', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const body = VerifyBodySchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ error: 'BAD_REQUEST', issues: body.error.issues })
    }

    const [doc] = await db
      .select()
      .from(sdfDocuments)
      .where(and(eq(sdfDocuments.id, request.params.id), eq(sdfDocuments.tenantId, request.tenant.id)))
      .limit(1)

    if (!doc) return reply.code(404).send({ error: 'NOT_FOUND' })
    if (!doc.signed) return reply.code(400).send({ error: 'NOT_SIGNED', message: 'Document has no signature' })

    const { body: sdfBuffer } = await s3.download(doc.s3Key)

    let publicKey: CryptoKey
    try {
      publicKey = await importSDFPublicKey(body.data.public_key, body.data.algorithm)
    } catch {
      return reply.code(400).send({ error: 'INVALID_KEY', message: 'Cannot import public key' })
    }

    const result = await verifySig(new Uint8Array(sdfBuffer), {
      publicKey,
      algorithm: body.data.algorithm,
    })

    await writeAudit({
      documentId: doc.id,
      tenantId:   request.tenant.id,
      action:     'verify',
      actor:      request.tenant.name,
      ip:         request.ip,
      statusCode: result.valid ? 200 : 400,
      metadata:   { valid: result.valid, algorithm: result.algorithm },
    })

    return reply.code(result.valid ? 200 : 400).send({
      valid:          result.valid,
      algorithm:      result.algorithm,
      signed_at:      result.signed_at,
      content_digest: result.content_digest,
      reason:         result.reason,
    })
  })
}
