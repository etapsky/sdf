// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const SignupSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
})

describe('signup schema', () => {
  it('rejects empty name', () => {
    const result = SignupSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('accepts valid input', () => {
    const result = SignupSchema.safeParse({ name: 'Acme Corp', email: 'a@b.com' })
    expect(result.success).toBe(true)
  })
})
