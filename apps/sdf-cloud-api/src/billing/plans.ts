// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
/** Plan limits — Free / Pro / Enterprise */

export const PLANS = {
  free: {
    id: 'free',
    name: 'free' as const,
    uploads_per_month: 100,
    storage_bytes: 500 * 1024 * 1024,
    api_calls_per_month: 1_000,
    price_cents: 0,
  },
  pro: {
    id: 'pro',
    name: 'pro' as const,
    uploads_per_month: 10_000,
    storage_bytes: 50 * 1024 * 1024 * 1024,
    api_calls_per_month: 100_000,
    price_cents: 4_900,
  },
  enterprise: {
    id: 'enterprise',
    name: 'enterprise' as const,
    uploads_per_month: Number.MAX_SAFE_INTEGER,
    storage_bytes: Number.MAX_SAFE_INTEGER,
    api_calls_per_month: Number.MAX_SAFE_INTEGER,
    price_cents: undefined,
  },
} as const

export type PlanId = keyof typeof PLANS

export function getPlan(planId: PlanId) {
  return PLANS[planId] ?? PLANS.free
}
