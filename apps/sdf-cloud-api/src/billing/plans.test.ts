// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest'
import { PLANS, getPlan } from './plans.js'

describe('plans', () => {
  it('defines free plan limits', () => {
    expect(PLANS.free.uploads_per_month).toBe(100)
    expect(PLANS.free.storage_bytes).toBe(500 * 1024 * 1024)
    expect(PLANS.free.price_cents).toBe(0)
  })

  it('defines pro plan limits', () => {
    expect(PLANS.pro.uploads_per_month).toBe(10_000)
    expect(PLANS.pro.price_cents).toBe(4_900)
  })

  it('getPlan returns plan by id', () => {
    expect(getPlan('free')).toEqual(PLANS.free)
    expect(getPlan('pro')).toEqual(PLANS.pro)
  })

  it('getPlan returns free for unknown', () => {
    expect(getPlan('unknown' as never)).toEqual(PLANS.free)
  })
})
