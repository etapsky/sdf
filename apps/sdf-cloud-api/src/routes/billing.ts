// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
/** Billing routes — usage, plans, upgrade */

import type { FastifyInstance } from 'fastify'
import { getUsageForTenant, getPeriodForMonth } from '../billing/metering.js'
import { PLANS } from '../billing/plans.js'
import { authMiddleware } from '@etapsky/sdf-server/middleware/auth'

export async function billingRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authMiddleware)

  fastify.get('/usage', async (request, reply) => {
    const now = new Date()
    const { start, end } = getPeriodForMonth(now.getUTCFullYear(), now.getUTCMonth() + 1)
    const usage = await getUsageForTenant(request.tenant.id, start, end)
    return reply.send(usage)
  })

  fastify.get('/plans', async (_request, reply) => {
    return reply.send(Object.values(PLANS))
  })
}
