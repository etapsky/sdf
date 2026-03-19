// ─── Authentication Middleware ────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Supports two authentication methods:
//   1. API Key  — Bearer <api_key>  (tenant-to-server)
//   2. JWT      — Bearer <jwt>      (SSO/SAML-issued tokens)
//
// API keys are hashed with SHA-256 + salt before storage.
// JWTs are signed with the tenant's per-tenant jwtSecret.

import type { FastifyRequest, FastifyReply } from 'fastify'
import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { db }       from '../db/client.js'
import { tenants, apiKeys } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { env }      from '../config/env.js'
import type { Tenant } from '../db/schema.js'

// ─── API Key hashing ──────────────────────────────────────────────────────────

export function hashApiKey(rawKey: string): string {
  return createHash('sha256')
    .update(env.API_KEY_SALT + rawKey)
    .digest('hex')
}

/**
 * Generate a cryptographically random API key.
 * Returns { rawKey, keyHash, keyPrefix }.
 * rawKey is shown ONCE to the user — never stored.
 */
export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const rawKey   = 'sdf_' + Buffer.from(globalThis.crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
  const keyHash  = hashApiKey(rawKey)
  const keyPrefix = rawKey.slice(0, 12) // "sdf_XXXXXXXX"
  return { rawKey, keyHash, keyPrefix }
}

// ─── JWT (minimal, no external dep) ──────────────────────────────────────────

interface JWTPayload {
  sub:       string;  // tenantId
  iat:       number;
  exp:       number;
  type:      'saml_session';
  name?:     string;
  email?:    string;
}

export function signJWT(payload: Omit<JWTPayload, 'iat'>, secret: string): string {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body    = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) })).toString('base64url')
  const sig     = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

export function verifyJWT(token: string, secret: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [header, body, sig] = parts
    const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')

    // Timing-safe comparison
    const sigBuf = Buffer.from(sig, 'base64url')
    const expBuf = Buffer.from(expected, 'base64url')
    if (sigBuf.length !== expBuf.length) return null
    if (!timingSafeEqual(sigBuf, expBuf)) return null

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as JWTPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}

// ─── Auth middleware ──────────────────────────────────────────────────────────

export async function authMiddleware(
  request: FastifyRequest,
  reply:   FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({
      error:   'UNAUTHORIZED',
      message: 'Missing or malformed Authorization header. Expected: Bearer <api_key_or_jwt>',
    })
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Empty token' })
  }

  // ── Try JWT first (contains dots) ─────────────────────────────────────────
  if (token.split('.').length === 3) {
    const tenant = await authenticateJWT(token)
    if (tenant) {
      request.tenant    = tenant
      request.authMethod = 'jwt'
      return
    }
    // Fall through to API key attempt
  }

  // ── Try API Key ────────────────────────────────────────────────────────────
  const tenant = await authenticateApiKey(token)
  if (tenant) {
    request.tenant    = tenant
    request.authMethod = 'api_key'
    return
  }

  return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Invalid or expired credentials' })
}

// ─── Admin-only middleware — rejects JWT auth ─────────────────────────────────
// Admin routes (tenant management, key creation) require API key auth.

export async function adminAuthMiddleware(
  request: FastifyRequest,
  reply:   FastifyReply,
): Promise<void> {
  await authMiddleware(request, reply)
  if (reply.sent) return

  if (request.authMethod !== 'api_key') {
    return reply.code(403).send({
      error:   'FORBIDDEN',
      message: 'Admin endpoints require API key authentication',
    })
  }

  // Optionally: check if this is a "root" admin key
  // For now, any valid API key can manage its own tenant
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function authenticateApiKey(rawKey: string): Promise<Tenant | null> {
  const keyHash = hashApiKey(rawKey)

  const [keyRow] = await db
    .select({ tenantId: apiKeys.tenantId, active: apiKeys.active, expiresAt: apiKeys.expiresAt })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1)

  if (!keyRow || !keyRow.active) return null
  if (keyRow.expiresAt && keyRow.expiresAt < new Date()) return null

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.id, keyRow.tenantId), eq(tenants.active, true)))
    .limit(1)

  if (!tenant) return null

  // Update lastUsedAt — fire and forget, never block auth
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.keyHash, keyHash))
    .catch(() => {})

  return tenant
}

async function authenticateJWT(token: string): Promise<Tenant | null> {
  // Decode payload without verifying to get tenantId for key lookup
  try {
    const parts   = token.split('.')
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as JWTPayload
    if (!payload.sub) return null

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, payload.sub), eq(tenants.active, true)))
      .limit(1)

    if (!tenant || !tenant.jwtSecret) return null

    // Now verify signature with tenant's secret
    const verified = verifyJWT(token, tenant.jwtSecret)
    if (!verified) return null

    return tenant
  } catch {
    return null
  }
}

// ─── Type augmentation ────────────────────────────────────────────────────────

declare module 'fastify' {
  interface FastifyRequest {
    tenant:     Tenant;
    authMethod: 'api_key' | 'jwt';
  }
}