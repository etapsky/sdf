// ─── BullMQ Redis Client ───────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Shared ioredis connection for the sdf-server application layer.
// BullMQ workers use a separate parsed-options connection to avoid type conflicts
// between the two ioredis copies bundled inside node_modules/bullmq.

import { Redis } from 'ioredis'
import { env }  from '../config/env.js'

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck:     false,
  lazyConnect:          true,
})

redis.on('error', (err) => {
  console.error('Redis error:', err.message)
})