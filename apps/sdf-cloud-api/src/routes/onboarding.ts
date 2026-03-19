// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
/** Onboarding routes — signup (no auth required) */

import type { FastifyInstance } from 'fastify'
import { createTenantWithKey } from '../onboarding/signup.js'

export async function onboardingRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: { name: string; email?: string } }>('/signup', async (request, reply) => {
    try {
      const result = await createTenantWithKey(request.body)
      return reply.code(201).send(result)
    } catch (err) {
      const e = err as { message?: string }
      return reply.code(400).send({ error: 'SIGNUP_FAILED', message: e.message ?? 'Invalid input' })
    }
  })
}
