// ─── Environment Configuration ────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Type-safe environment variable parsing with Zod.
// All required vars are validated at process startup — missing vars cause an
// immediate, descriptive fatal exit rather than a silent runtime failure.

import { z } from 'zod'

const EnvSchema = z.object({
  // Server
  NODE_ENV:    z.enum(['development', 'production', 'test']).default('development'),
  PORT:        z.coerce.number().default(3000),
  HOST:        z.string().default('0.0.0.0'),
  LOG_LEVEL:   z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),

  // PostgreSQL
  DATABASE_URL: z.string().url().describe('PostgreSQL connection string'),

  // Redis
  REDIS_URL:    z.string().default('redis://localhost:6379'),

  // S3 / MinIO
  S3_ENDPOINT:         z.string().optional(), // MinIO only — omit for AWS S3
  S3_BUCKET:           z.string().default('sdf-documents'),
  S3_REGION:           z.string().default('us-east-1'),
  S3_ACCESS_KEY_ID:    z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false), // true for MinIO

  // Auth
  API_KEY_SALT: z.string().min(32).describe('Salt for API key hashing — min 32 chars'),

  // Rate limiting
  RATE_LIMIT_MAX:     z.coerce.number().default(100),
  RATE_LIMIT_WINDOW:  z.string().default('1 minute'),

  // Webhooks
  WEBHOOK_SECRET:     z.string().optional(),
  WEBHOOK_TIMEOUT_MS: z.coerce.number().default(10_000),

  // Queue
  QUEUE_CONCURRENCY:  z.coerce.number().default(5),

  // CORS
  CORS_ORIGIN: z.string().default('*'),
})

export type Env = z.infer<typeof EnvSchema>

function parseEnv(): Env {
  const result = EnvSchema.safeParse(process.env)
  if (!result.success) {
    console.error('❌  Invalid environment configuration:')
    for (const err of result.error.errors) {
      console.error(`    ${err.path.join('.')}: ${err.message}`)
    }
    process.exit(1)
  }
  return result.data
}

export const env = parseEnv()