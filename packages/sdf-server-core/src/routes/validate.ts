// ─── Validate Route ───────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// POST /sdf/validate — parse and validate a .sdf file without persisting it.
// Returns structured validation errors (422) or a summary on success (200).
// No S3, DB, or queue side-effects — safe for high-volume pre-flight checks.

import type { FastifyInstance } from 'fastify'
import { parseSDF }             from '@etapsky/sdf-kit/reader'
import { authMiddleware }        from '../middleware/auth.js'

export async function validateRoutes(fastify: FastifyInstance): Promise<void> {

  fastify.post('/sdf/validate', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const data = await request.file()
    if (!data) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'No file provided' })
    }

    const chunks: Buffer[] = []
    for await (const chunk of data.file) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)

    try {
      const parsed = await parseSDF(new Uint8Array(buffer))
      return reply.send({
        valid:         true,
        document_id:   parsed.meta.document_id,
        document_type: parsed.meta.document_type,
        sdf_version:   parsed.meta.sdf_version,
        issuer:        parsed.meta.issuer,
        signed:        !!parsed.meta.signature_algorithm,
        size_bytes:    buffer.length,
      })
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string; details?: unknown }
      return reply.code(422).send({
        valid:   false,
        error:   e.code ?? 'INVALID_SDF',
        message: e.message,
        details: e.details,
      })
    }
  })
}
