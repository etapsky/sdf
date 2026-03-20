// ─── @etapsky/sdf-server-core ─────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Public API barrel — re-exports everything needed by sdf-server and sdf-cloud-api.

export { buildServer }                from './api/server.js'
export type { BuildServerOptions }    from './api/server.js'

export {
  startWorkers,
  validateQueue, signQueue, webhookQueue,
  QUEUE_VALIDATE, QUEUE_SIGN, QUEUE_WEBHOOK,
} from './queue/jobs.js'
export type { ValidateSdfJob, SignSdfJob, WebhookDeliveryJob } from './queue/jobs.js'

export { redis }                      from './queue/client.js'

export { env }                        from './config/env.js'
export type { Env }                   from './config/env.js'

export { db, writeAudit, connectDb }  from './db/client.js'
export type { Database }              from './db/client.js'
export * from './db/schema.js'

export { s3, S3Client }               from './storage/s3.js'
export type { UploadResult, DownloadResult, PresignedUrlResult } from './storage/s3.js'

export {
  authMiddleware, adminAuthMiddleware,
  generateApiKey, hashApiKey,
  signJWT, verifyJWT,
} from './middleware/auth.js'

export { registerConnectors }         from './connectors/index.js'
export * from './connectors/base/types.js'
export * from './connectors/base/mapper.js'
export { connectorRegistry }          from './connectors/base/registry.js'
export { ERPHttpClient }              from './connectors/base/http.js'
export { SAPConnector }               from './connectors/sap/connector.js'
export { OracleConnector }            from './connectors/oracle/connector.js'
