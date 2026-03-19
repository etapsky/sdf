// ─── Queue Job Definitions ────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// BullMQ queue declarations, job payload types, and worker implementations for
// three async pipelines: validate-sdf (3 attempts), sign-sdf (2 attempts, CPU-
// bound concurrency 2), and webhook-delivery (5 attempts, exponential backoff).

import { Queue, Worker, type Job } from 'bullmq'
import { env }       from '../config/env.js'
import { parseSDF }  from '@etapsky/sdf-kit/reader'
import { signSDF, importSDFPrivateKey } from '@etapsky/sdf-kit/signer'
import { db, writeAudit } from '../db/client.js'
import { sdfDocuments }   from '../db/schema.js'
import { s3, S3Client }  from '../storage/s3.js'
import { eq }             from 'drizzle-orm'

// BullMQ bundles its own ioredis — pass connection options, not a Redis instance,
// to avoid type conflicts between the two ioredis copies in node_modules.
function parseRedisOptions(url: string) {
  const parsed = new URL(url)
  return {
    host:                 parsed.hostname,
    port:                 parseInt(parsed.port || '6379', 10),
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
    maxRetriesPerRequest: null,  // required by BullMQ
    enableReadyCheck:     false,
    lazyConnect:          true,
  }
}

const connection = parseRedisOptions(env.REDIS_URL)

// ─── Job payload types ────────────────────────────────────────────────────────

export interface ValidateSdfJob {
  documentDbId: string;
  s3Key:        string;
  tenantId:     string;
  actor:        string;
  ip:           string;
}

export interface SignSdfJob {
  documentDbId:    string;
  s3Key:           string;
  tenantId:        string;
  privateKeyB64:   string;
  algorithm:       'ECDSA' | 'RSASSA-PKCS1-v1_5';
  includePDF:      boolean;
  actor:           string;
  ip:              string;
}

export interface WebhookDeliveryJob {
  webhookUrl:    string;
  webhookSecret: string;
  event:         string;
  payload:       Record<string, unknown>;
  tenantId:      string;
  attempt:       number;
}

// ─── Queue names ──────────────────────────────────────────────────────────────

export const QUEUE_VALIDATE = 'sdf-validate'
export const QUEUE_SIGN     = 'sdf-sign'
export const QUEUE_WEBHOOK  = 'sdf-webhook'

// ─── Queues ───────────────────────────────────────────────────────────────────

export const validateQueue = new Queue<ValidateSdfJob, unknown, 'validate-sdf'>(QUEUE_VALIDATE, {
  connection,
  defaultJobOptions: {
    attempts:    3,
    backoff:     { type: 'exponential', delay: 1_000 },
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 500 },
  },
})

export const signQueue = new Queue<SignSdfJob, unknown, 'sign-sdf'>(QUEUE_SIGN, {
  connection,
  defaultJobOptions: {
    attempts:    2,
    backoff:     { type: 'fixed', delay: 2_000 },
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 200 },
  },
})

export const webhookQueue = new Queue<WebhookDeliveryJob, unknown, 'webhook-delivery'>(QUEUE_WEBHOOK, {
  connection,
  defaultJobOptions: {
    attempts:    5,
    backoff:     { type: 'exponential', delay: 2_000 },
    removeOnComplete: { count: 200 },
    removeOnFail:     { count: 500 },
  },
})

// ─── Workers ──────────────────────────────────────────────────────────────────

export function startWorkers(): void {

  // ── validate-sdf worker ───────────────────────────────────────────────────
  new Worker<ValidateSdfJob, unknown, 'validate-sdf'>(QUEUE_VALIDATE, async (job: Job<ValidateSdfJob, unknown, 'validate-sdf'>) => {
    const { documentDbId, s3Key, tenantId, actor, ip } = job.data

    const { body } = await s3.download(s3Key)
    const result   = await parseSDF(body) // throws on invalid

    await writeAudit({
      documentId: documentDbId,
      tenantId,
      action:     'validate',
      actor,
      ip,
      statusCode: 200,
      metadata:   {
        sdf_version:   result.meta.sdf_version,
        document_type: result.meta.document_type,
      },
    })

    return { valid: true, documentType: result.meta.document_type }
  }, {
    connection,
    concurrency: env.QUEUE_CONCURRENCY,
  })

  // ── sign-sdf worker ───────────────────────────────────────────────────────
  new Worker<SignSdfJob, unknown, 'sign-sdf'>(QUEUE_SIGN, async (job: Job<SignSdfJob, unknown, 'sign-sdf'>) => {
    const { documentDbId, s3Key, tenantId, privateKeyB64, algorithm, includePDF, actor, ip } = job.data

    const { body }   = await s3.download(s3Key)
    const privateKey = await importSDFPrivateKey(privateKeyB64, algorithm)

    const { buffer: signedBuffer, result } = await signSDF(
      new Uint8Array(body),
      { privateKey, algorithm, includePDF },
    )

    // Overwrite in S3
    await s3.upload(s3Key, signedBuffer)

    // Update DB record
    await db.update(sdfDocuments)
      .set({
        signed:             true,
        signatureAlgorithm: result.algorithm,
        signedAt:           new Date(result.signed_at),
      })
      .where(eq(sdfDocuments.id, documentDbId))

    await writeAudit({
      documentId: documentDbId,
      tenantId,
      action:     'sign',
      actor,
      ip,
      statusCode: 200,
      metadata:   {
        algorithm:      result.algorithm,
        content_digest: result.content_digest,
      },
    })

    return { signed: true, algorithm: result.algorithm, signed_at: result.signed_at }
  }, {
    connection,
    concurrency: 2, // signing is CPU-bound — limit concurrency
  })

  // ── webhook-delivery worker ───────────────────────────────────────────────
  new Worker<WebhookDeliveryJob, unknown, 'webhook-delivery'>(QUEUE_WEBHOOK, async (job: Job<WebhookDeliveryJob, unknown, 'webhook-delivery'>) => {
    const { webhookUrl, webhookSecret, event, payload, tenantId } = job.data

    const body      = JSON.stringify({ event, payload, timestamp: new Date().toISOString() })
    const signature = await signWebhookPayload(body, webhookSecret)

    const response = await fetch(webhookUrl, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'X-SDF-Event':       event,
        'X-SDF-Signature':   signature,
        'X-SDF-Tenant':      tenantId,
      },
      body,
      signal: AbortSignal.timeout(env.WEBHOOK_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: HTTP ${response.status}`)
    }

    return { delivered: true, status: response.status }
  }, {
    connection,
    concurrency: 10,
  })

  console.log('✓ BullMQ workers started')
}

// ─── Webhook signature ────────────────────────────────────────────────────────

async function signWebhookPayload(body: string, secret: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return Buffer.from(sig).toString('hex')
}