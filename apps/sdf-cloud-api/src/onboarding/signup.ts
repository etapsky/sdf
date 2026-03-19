// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
/** Signup — create tenant + first API key */

import { z } from 'zod'
import { db } from '@etapsky/sdf-server/db'
import { tenants, apiKeys } from '@etapsky/sdf-server/schema'
import { generateApiKey } from '@etapsky/sdf-server/middleware/auth'

const SignupSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
})

export type SignupInput = z.infer<typeof SignupSchema>

export interface SignupResult {
  tenant_id: string
  api_key: string
  key_prefix: string
  message: 'Store the api_key securely — it will not be shown again'
}

export async function createTenantWithKey(input: SignupInput): Promise<SignupResult> {
  const { name } = SignupSchema.parse(input)

  const [tenant] = await db
    .insert(tenants)
    .values({
      name,
      rateLimit: 100,
    })
    .returning()

  if (!tenant) throw new Error('Failed to create tenant')

  const { rawKey, keyHash, keyPrefix } = generateApiKey()

  await db.insert(apiKeys).values({
    tenantId: tenant.id,
    keyHash,
    keyPrefix,
    label: 'Initial key',
  })

  return {
    tenant_id: tenant.id,
    api_key: rawKey,
    key_prefix: keyPrefix,
    message: 'Store the api_key securely — it will not be shown again',
  }
}
