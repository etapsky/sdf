// ─── PostgreSQL Client — Drizzle ORM ──────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// pg connection pool (max 20) wired into Drizzle ORM, plus a fire-and-forget
// audit helper that silently swallows errors to protect the main request flow.

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool }    from 'pg'
import { env }     from '../config/env.js'
import * as schema from './schema.js'

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max:              20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err)
})

export const db = drizzle(pool, { schema })

export type Database = typeof db

// ─── Audit helper ─────────────────────────────────────────────────────────────

import { auditLog, type NewAuditEntry } from './schema.js'

export async function writeAudit(entry: Omit<NewAuditEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    await db.insert(auditLog).values(entry)
  } catch (err) {
    // Audit failures must never crash the main flow
    console.error('Audit log write failed:', err)
  }
}