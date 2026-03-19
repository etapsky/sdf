// ─── Admin Routes ─────────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Tenant lifecycle and API key management. All endpoints require API key auth
// (JWT is rejected) — see adminAuthMiddleware.
//
// POST   /admin/tenants                 Create tenant
// GET    /admin/tenants/:id             Get tenant
// PATCH  /admin/tenants/:id             Update tenant
// GET    /admin/tenants/:id/keys        List API keys
// POST   /admin/tenants/:id/keys        Create API key
// DELETE /admin/tenants/:id/keys/:keyId Revoke API key
// GET    /admin/tenants/:id/audit       Audit log

import type { FastifyInstance } from 'fastify'
import { z }                    from 'zod'
import { db, writeAudit }       from '../db/client.js'
import { tenants, apiKeys, auditLog } from '../db/schema.js'
import { generateApiKey }        from '../middleware/auth.js'
import { adminAuthMiddleware }   from '../middleware/auth.js'
import { eq, and, desc }        from 'drizzle-orm'
import { randomBytes }           from 'crypto'

const CreateTenantSchema = z.object({
  name:          z.string().min(1).max(100),
  rateLimit:     z.number().int().min(1).max(10_000).default(100),
  webhookUrl:    z.string().url().optional(),
  webhookSecret: z.string().min(16).optional(),
})

const UpdateTenantSchema = z.object({
  name:          z.string().min(1).max(100).optional(),
  rateLimit:     z.number().int().min(1).max(10_000).optional(),
  webhookUrl:    z.string().url().nullable().optional(),
  webhookSecret: z.string().min(16).nullable().optional(),
  active:        z.boolean().optional(),
})

const CreateKeySchema = z.object({
  label:    z.string().max(100).optional(),
  expiresAt: z.string().datetime().optional(),
})

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {

  // ── POST /admin/tenants ───────────────────────────────────────────────────
  fastify.post('/admin/tenants', {
    preHandler: [adminAuthMiddleware],
  }, async (request, reply) => {
    const body = CreateTenantSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ error: 'BAD_REQUEST', issues: body.error.issues })
    }

    // Generate per-tenant JWT secret
    const jwtSecret = randomBytes(32).toString('hex')

    const [tenant] = await db.insert(tenants).values({
      name:          body.data.name,
      rateLimit:     body.data.rateLimit,
      webhookUrl:    body.data.webhookUrl,
      webhookSecret: body.data.webhookSecret,
      jwtSecret,
    }).returning()

    // Create first API key for the new tenant
    const { rawKey, keyHash, keyPrefix } = generateApiKey()
    await db.insert(apiKeys).values({
      tenantId:  tenant.id,
      keyHash,
      keyPrefix,
      label:    'Default key',
    })

    await writeAudit({
      tenantId:  request.tenant.id,
      action:    'tenant_created',
      actor:     request.tenant.name,
      ip:        request.ip,
      statusCode: 201,
      metadata:  { created_tenant_id: tenant.id, created_tenant_name: tenant.name },
    })

    return reply.code(201).send({
      tenant: {
        id:        tenant.id,
        name:      tenant.name,
        rateLimit: tenant.rateLimit,
        active:    tenant.active,
        createdAt: tenant.createdAt,
      },
      // rawKey shown ONCE — not stored
      initial_api_key: {
        key:    rawKey,
        prefix: keyPrefix,
        label:  'Default key',
        warning: 'Store this key securely. It will not be shown again.',
      },
    })
  })

  // ── GET /admin/tenants/:id ────────────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>('/admin/tenants/:id', {
    preHandler: [adminAuthMiddleware],
  }, async (request, reply) => {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, request.params.id)).limit(1)
    if (!tenant) return reply.code(404).send({ error: 'NOT_FOUND' })

    return reply.send({
      id:            tenant.id,
      name:          tenant.name,
      rateLimit:     tenant.rateLimit,
      webhookUrl:    tenant.webhookUrl,
      active:        tenant.active,
      samlConfigured: !!tenant.samlIdpEntityId,
      createdAt:     tenant.createdAt,
      updatedAt:     tenant.updatedAt,
    })
  })

  // ── PATCH /admin/tenants/:id ──────────────────────────────────────────────
  fastify.patch<{ Params: { id: string } }>('/admin/tenants/:id', {
    preHandler: [adminAuthMiddleware],
  }, async (request, reply) => {
    const body = UpdateTenantSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ error: 'BAD_REQUEST', issues: body.error.issues })
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (body.data.name        !== undefined) updates.name          = body.data.name
    if (body.data.rateLimit   !== undefined) updates.rateLimit     = body.data.rateLimit
    if (body.data.webhookUrl  !== undefined) updates.webhookUrl    = body.data.webhookUrl
    if (body.data.webhookSecret !== undefined) updates.webhookSecret = body.data.webhookSecret
    if (body.data.active      !== undefined) updates.active        = body.data.active

    const [updated] = await db
      .update(tenants)
      .set(updates)
      .where(eq(tenants.id, request.params.id))
      .returning()

    if (!updated) return reply.code(404).send({ error: 'NOT_FOUND' })
    return reply.send({ id: updated.id, name: updated.name, active: updated.active, updatedAt: updated.updatedAt })
  })

  // ── GET /admin/tenants/:id/keys ───────────────────────────────────────────
  fastify.get<{ Params: { id: string } }>('/admin/tenants/:id/keys', {
    preHandler: [adminAuthMiddleware],
  }, async (request, reply) => {
    const keys = await db
      .select({
        id:         apiKeys.id,
        keyPrefix:  apiKeys.keyPrefix,
        label:      apiKeys.label,
        active:     apiKeys.active,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt:  apiKeys.expiresAt,
        createdAt:  apiKeys.createdAt,
        revokedAt:  apiKeys.revokedAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.tenantId, request.params.id))
      .orderBy(desc(apiKeys.createdAt))

    return reply.send({ keys, total: keys.length })
  })

  // ── POST /admin/tenants/:id/keys ──────────────────────────────────────────
  fastify.post<{ Params: { id: string } }>('/admin/tenants/:id/keys', {
    preHandler: [adminAuthMiddleware],
  }, async (request, reply) => {
    const body = CreateKeySchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ error: 'BAD_REQUEST', issues: body.error.issues })
    }

    const { rawKey, keyHash, keyPrefix } = generateApiKey()

    const [key] = await db.insert(apiKeys).values({
      tenantId:  request.params.id,
      keyHash,
      keyPrefix,
      label:     body.data.label,
      expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : undefined,
    }).returning()

    await writeAudit({
      tenantId:  request.tenant.id,
      action:    'key_created',
      actor:     request.tenant.name,
      ip:        request.ip,
      statusCode: 201,
      metadata:  { key_id: key.id, key_prefix: keyPrefix, target_tenant: request.params.id },
    })

    return reply.code(201).send({
      id:        key.id,
      key:       rawKey,       // shown ONCE
      prefix:    keyPrefix,
      label:     key.label,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      warning:   'Store this key securely. It will not be shown again.',
    })
  })

  // ── DELETE /admin/tenants/:id/keys/:keyId ─────────────────────────────────
  fastify.delete<{ Params: { id: string; keyId: string } }>('/admin/tenants/:id/keys/:keyId', {
    preHandler: [adminAuthMiddleware],
  }, async (request, reply) => {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, request.params.keyId), eq(apiKeys.tenantId, request.params.id)))
      .limit(1)

    if (!key) return reply.code(404).send({ error: 'NOT_FOUND' })
    if (!key.active) return reply.code(409).send({ error: 'ALREADY_REVOKED' })

    await db
      .update(apiKeys)
      .set({ active: false, revokedAt: new Date() })
      .where(eq(apiKeys.id, key.id))

    await writeAudit({
      tenantId:  request.tenant.id,
      action:    'key_revoked',
      actor:     request.tenant.name,
      ip:        request.ip,
      statusCode: 200,
      metadata:  { key_id: key.id, key_prefix: key.keyPrefix },
    })

    return reply.send({ revoked: true, id: key.id, prefix: key.keyPrefix })
  })

  // ── GET /admin/tenants/:id/audit ──────────────────────────────────────────
  fastify.get<{ Params: { id: string }; Querystring: { limit?: string; offset?: string } }>('/admin/tenants/:id/audit', {
    preHandler: [adminAuthMiddleware],
  }, async (request, reply) => {
    const limit  = Math.min(parseInt(request.query.limit  ?? '50', 10), 500)
    const offset = parseInt(request.query.offset ?? '0', 10)

    const entries = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.tenantId, request.params.id))
      .orderBy(desc(auditLog.timestamp))
      .limit(limit)
      .offset(offset)

    return reply.send({ entries, total: entries.length, limit, offset })
  })
}
