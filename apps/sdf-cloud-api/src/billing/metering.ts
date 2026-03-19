// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
/** Usage metering — uploads, downloads, storage (integrates with Stripe Metering later) */

import { db } from '@etapsky/sdf-server/db'
import { sdfDocuments } from '@etapsky/sdf-server/schema'
import { sql, eq, and, gte, lte } from 'drizzle-orm'
import type { PlanId } from './plans.js'

export interface UsageRecord {
  uploads_count: number
  downloads_count: number
  storage_bytes: number
  api_calls_count: number
  period_start: string
  period_end: string
}

export async function getUsageForTenant(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<UsageRecord> {
  const start = periodStart.toISOString()
  const end = periodEnd.toISOString()

  const [uploads] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sdfDocuments)
    .where(
      and(
        eq(sdfDocuments.tenantId, tenantId),
        gte(sdfDocuments.createdAt, periodStart),
        lte(sdfDocuments.createdAt, periodEnd)
      )
    )

  const [storage] = await db
    .select({ total: sql<number>`coalesce(sum(size_bytes), 0)::bigint` })
    .from(sdfDocuments)
    .where(eq(sdfDocuments.tenantId, tenantId))

  return {
    uploads_count: uploads?.count ?? 0,
    downloads_count: 0, // TODO: from audit_log
    storage_bytes: Number(storage?.total ?? 0),
    api_calls_count: 0, // TODO: from audit_log
    period_start: start,
    period_end: end,
  }
}

export function getPeriodForMonth(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
  return { start, end }
}
