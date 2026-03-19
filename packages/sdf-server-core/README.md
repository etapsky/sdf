# @etapsky/sdf-server-core

> SDF server-side business logic — Fastify, BullMQ, S3/MinIO, PostgreSQL, ERP Connectors.

[![npm](https://img.shields.io/npm/v/@etapsky/sdf-server-core)](https://www.npmjs.com/package/@etapsky/sdf-server-core)
[![License: BUSL-1.1](https://img.shields.io/badge/License-BUSL--1.1-blue.svg)](../../LICENSE)

Part of the [Etapsky SDF](https://github.com/etapsky/sdf) monorepo.

---

## What it does

`@etapsky/sdf-server-core` contains all server-side business logic for the SDF platform: REST API route handlers, authentication middleware, database schema, queue workers, S3 storage adapter, and ERP connector infrastructure. It is designed to be consumed by two types of deployments:

- **`sdf-server`** — standalone self-hosted deployment. Imports this package and adds a bootstrap entrypoint (`index.ts`, `docker-compose.yml`, `.env`).
- **`sdf-cloud-api`** — SaaS layer. Imports this package and extends it with additional routes (billing, onboarding, tenant provisioning) via the `registerExtraRoutes` hook on `buildServer()`.

The package contains no process-level bootstrap code — it exports factory functions and singletons only. The calling application owns the startup sequence.

---

## Installation

```bash
npm install @etapsky/sdf-server-core
```

Peer runtime requirements: **Node.js 20 LTS or later**, **PostgreSQL 14+**, **Redis 7+**, **S3-compatible object storage** (AWS S3, MinIO, Cloudflare R2).

---

## Quick start

### Standalone deployment (`sdf-server`)

```typescript
import { buildServer, startWorkers, registerConnectors } from '@etapsky/sdf-server-core'
import { redis } from '@etapsky/sdf-server-core/queue'
import { env }   from '@etapsky/sdf-server-core/config'

// Startup sequence: Redis → ERP connectors → BullMQ workers → Fastify
await redis.connect()
await registerConnectors()
startWorkers()

const server = await buildServer()
await server.listen({ port: env.PORT, host: env.HOST })
```

### SaaS layer (`sdf-cloud-api`)

```typescript
import { buildServer, startWorkers, registerConnectors } from '@etapsky/sdf-server-core'
import { billingRoutes }    from './routes/billing.js'
import { onboardingRoutes } from './routes/onboarding.js'

const server = await buildServer({
  // Inject additional routes — registered after all core routes
  registerExtraRoutes: async (fastify) => {
    await fastify.register(billingRoutes)
    await fastify.register(onboardingRoutes)
  },
})
```

---

## Configuration

All configuration is loaded from environment variables at startup. Missing required variables cause an immediate, descriptive process exit — never a silent runtime failure.

Import the parsed, type-safe config object from any module:

```typescript
import { env } from '@etapsky/sdf-server-core/config'

console.log(env.PORT)         // number
console.log(env.DATABASE_URL) // string
```

### Environment variables

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `DATABASE_URL` | `string` | **yes** | — | PostgreSQL connection string |
| `REDIS_URL` | `string` | | `redis://localhost:6379` | Redis connection URL |
| `S3_ACCESS_KEY_ID` | `string` | **yes** | — | S3 / MinIO access key |
| `S3_SECRET_ACCESS_KEY` | `string` | **yes** | — | S3 / MinIO secret key |
| `API_KEY_SALT` | `string` | **yes** | — | Salt for API key hashing — min 32 chars |
| `PORT` | `number` | | `3000` | Server listening port |
| `HOST` | `string` | | `0.0.0.0` | Server listening host |
| `LOG_LEVEL` | `string` | | `info` | Pino log level: `trace` `debug` `info` `warn` `error` |
| `NODE_ENV` | `string` | | `development` | `development` `production` `test` |
| `S3_BUCKET` | `string` | | `sdf-documents` | S3 bucket name |
| `S3_REGION` | `string` | | `us-east-1` | S3 region |
| `S3_ENDPOINT` | `string` | | — | Custom endpoint — required for MinIO / R2 |
| `S3_FORCE_PATH_STYLE` | `boolean` | | `false` | Set `true` for MinIO path-style URLs |
| `RATE_LIMIT_MAX` | `number` | | `100` | Global rate limit — requests per window |
| `RATE_LIMIT_WINDOW` | `string` | | `1 minute` | Rate limit time window |
| `WEBHOOK_SECRET` | `string` | | — | HMAC secret for outbound webhook signatures |
| `WEBHOOK_TIMEOUT_MS` | `number` | | `10000` | Outbound webhook delivery timeout |
| `QUEUE_CONCURRENCY` | `number` | | `5` | BullMQ worker concurrency |
| `CORS_ORIGIN` | `string` | | `*` | Allowed CORS origins — comma-separated list or `*` |

---

## API

### `buildServer(options?): Promise<FastifyInstance>`

Assembles and returns a Fastify instance with all plugins and routes registered. Does **not** call `listen()` — the caller controls binding.

```typescript
import { buildServer } from '@etapsky/sdf-server-core'

const server = await buildServer()
await server.listen({ port: 3000, host: '0.0.0.0' })
```

**Options:**

| Option | Type | Description |
|---|---|---|
| `registerExtraRoutes` | `(fastify: FastifyInstance) => Promise<void>` | Optional hook to register additional routes after all core routes. Used by `sdf-cloud-api` to add SaaS-specific endpoints. |

Plugins registered: `@fastify/cors`, `@fastify/multipart` (200 MB file limit), `@fastify/rate-limit` (tenant-aware, dynamic per-tenant limits from DB).

---

### `startWorkers(): void`

Starts all three BullMQ workers. Must be called after `redis.connect()`.

```typescript
import { startWorkers } from '@etapsky/sdf-server-core'

startWorkers()
// ✓ BullMQ workers started
```

Workers started:

| Worker | Queue | Concurrency | Retries |
|---|---|---|---|
| `validate-sdf` | `sdf-validate` | `QUEUE_CONCURRENCY` | 3 — exponential backoff |
| `sign-sdf` | `sdf-sign` | 2 (CPU-bound) | 2 — fixed 2 s delay |
| `webhook-delivery` | `sdf-webhook` | 10 | 5 — exponential backoff |

---

### `registerConnectors(): void`

Registers SAP and Oracle connector factories in the global `ConnectorRegistry`. Must be called before any request that invokes the connector routes.

```typescript
import { registerConnectors } from '@etapsky/sdf-server-core'

registerConnectors()
// ✓ ERP connector factories registered: SAP, Oracle
```

---

### `redis`

The shared `ioredis` connection used by the application layer. BullMQ workers use a separate parsed-options connection internally to avoid type conflicts.

```typescript
import { redis } from '@etapsky/sdf-server-core/queue'

await redis.connect()

// Graceful shutdown
await redis.quit()
```

---

### `db` and `writeAudit()`

Drizzle ORM client (pg connection pool, max 20) and a fire-and-forget audit log helper.

```typescript
import { db, writeAudit } from '@etapsky/sdf-server-core/db'
import { tenants }        from '@etapsky/sdf-server-core/db/schema'
import { eq }             from 'drizzle-orm'

// Direct Drizzle queries
const tenant = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1)

// Audit log — never throws, never blocks the main flow
await writeAudit({
  tenantId:   tenant.id,
  action:     'upload',
  actor:      'acme-corp',
  ip:         '1.2.3.4',
  statusCode: 201,
  metadata:   { document_type: 'invoice' },
})
```

---

### `s3`

S3/MinIO storage adapter using native `fetch` + AWS Signature V4. No AWS SDK dependency.

```typescript
import { s3, S3Client } from '@etapsky/sdf-server-core/storage'

// Build a canonical key
const key = S3Client.buildKey(tenantId, documentId) // "<tenantId>/<documentId>.sdf"

// Upload
const result = await s3.upload(key, buffer)
// { key, bucket, sizeBytes, etag }

// Download
const { body, contentType, sizeBytes } = await s3.download(key)

// Delete
await s3.delete(key)
```

Compatible with AWS S3, MinIO, Cloudflare R2, and any S3-compatible store. Set `S3_ENDPOINT` and `S3_FORCE_PATH_STYLE=true` for MinIO.

---

### Queue exports

Direct access to the three BullMQ `Queue` instances for enqueuing jobs from outside the route layer:

```typescript
import { validateQueue, signQueue, webhookQueue } from '@etapsky/sdf-server-core/queue/jobs'
import type { ValidateSdfJob, SignSdfJob, WebhookDeliveryJob } from '@etapsky/sdf-server-core/queue/jobs'

await validateQueue.add('validate-sdf', {
  documentDbId: doc.id,
  s3Key:        key,
  tenantId:     tenant.id,
  actor:        tenant.name,
  ip:           '1.2.3.4',
})
```

---

### Authentication

```typescript
import {
  authMiddleware,
  adminAuthMiddleware,
  generateApiKey,
  hashApiKey,
  signJWT,
  verifyJWT,
} from '@etapsky/sdf-server-core/middleware/auth'
```

Two authentication methods are supported:

**API Key** (`Bearer sdf_...`) — SHA-256(salt + raw_key) stored in `api_keys` table. Timing-safe comparison. Supports per-key expiry and independent revocation.

**JWT** (`Bearer <jwt>`) — HS256, signed with the per-tenant `jwtSecret`. Issued by the SAML 2.0 callback endpoint. TTL: 8 hours.

`authMiddleware` tries JWT first (dot-separated token), then falls back to API key. `adminAuthMiddleware` rejects JWT auth — admin operations require an API key.

**Generating an API key:**

```typescript
const { rawKey, keyHash, keyPrefix } = generateApiKey()
// rawKey  — show once to user, never store
// keyHash — store in DB (api_keys.key_hash)
// keyPrefix — store for display ("sdf_XXXXXXXX...")
```

---

### ERP Connectors

```typescript
import {
  connectorRegistry,
  SAPConnector,
  OracleConnector,
} from '@etapsky/sdf-server-core/connectors'
import type { ERPConnectorConfig } from '@etapsky/sdf-server-core/connectors'
```

Connectors are instantiated per tenant and cached in `ConnectorRegistry`.

**Configure a connector for a tenant:**

```typescript
const config: ERPConnectorConfig = {
  type:    'SAP',
  baseUrl: 'https://sap.example.com',
  auth: {
    type:         'oauth2',
    clientId:     'client-id',
    clientSecret: 'client-secret',
    tokenUrl:     'https://sap.example.com/oauth/token',
  },
}

const connector = connectorRegistry.configure(tenantId, config)

// Health check
const health = await connector.healthCheck()
// { connected: true, latencyMs: 42, system: 'SAP' }

// Push a parsed SDF document to ERP
const result = await connector.pushDocument(data, meta, 'invoice')
// { success: true, erpRef: 'DOC-001', erpSystem: 'SAP', ... }

// Match a nomination reference
const match = await connector.matchNomination('NOM-2026-001')

// Query document status in ERP
const status = await connector.queryStatus(erpRef)
```

**Auth strategies** supported: `basic`, `bearer`, `oauth2` (client_credentials), `api_key`.

**Built-in field mappings:**

| SDF document type | SAP object | Oracle object |
|---|---|---|
| `invoice` | `SupplierInvoice` (FI module) | `supplierInvoices` (AP) |
| `nomination` | `NominationItem` (MM module) | `purchaseOrders` (SCM) |

Custom field mappings can be injected via `config.fieldMappings: Record<string, string>` — keys are SDF source paths (dot notation), values are ERP target field names.

---

## REST API routes

All routes are registered under the `/v1` prefix.

### SDF documents

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/sdf/upload` | API key / JWT | Upload a `.sdf` file — validates, stores in S3, inserts DB record, enqueues validation job |
| `GET` | `/v1/sdf` | API key / JWT | List documents for the authenticated tenant |
| `GET` | `/v1/sdf/:id` | API key / JWT | Download the `.sdf` file |
| `GET` | `/v1/sdf/:id/meta` | API key / JWT | Return `meta.json` as JSON |
| `GET` | `/v1/sdf/:id/data` | API key / JWT | Return `data.json` as JSON |
| `DELETE` | `/v1/sdf/:id` | API key / JWT | Delete document from S3 and DB |

### Sign / verify

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/sdf/:id/sign` | API key / JWT | Enqueue async signing job — returns `202 Accepted` with `job_id` |
| `POST` | `/v1/sdf/:id/verify` | API key / JWT | Verify signature synchronously — returns `{ valid, algorithm, signed_at, content_digest }` |

### Validate (pre-flight)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/sdf/validate` | API key / JWT | Parse and validate a `.sdf` file without persisting — no S3, DB, or queue side-effects |

### Schema registry

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/v1/schemas` | API key / JWT | List all registered schema types |
| `GET` | `/v1/schemas/:type` | API key / JWT | List versions for a document type |
| `GET` | `/v1/schemas/:type/:version` | API key / JWT | Retrieve schema metadata and JSON Schema body |

### Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/admin/tenants` | API key only | Create tenant + generate initial API key |
| `GET` | `/v1/admin/tenants/:id` | API key only | Get tenant details |
| `PATCH` | `/v1/admin/tenants/:id` | API key only | Update tenant (name, rateLimit, webhook, active) |
| `GET` | `/v1/admin/tenants/:id/keys` | API key only | List API keys |
| `POST` | `/v1/admin/tenants/:id/keys` | API key only | Create API key (shown once) |
| `DELETE` | `/v1/admin/tenants/:id/keys/:keyId` | API key only | Revoke API key |
| `GET` | `/v1/admin/tenants/:id/audit` | API key only | Audit log with pagination |

### SAML 2.0 SSO

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/v1/auth/saml/:tenantId/metadata` | none | SP metadata XML — register this URL in your IdP |
| `GET` | `/v1/auth/saml/:tenantId/login` | none | Initiate SSO login (redirects to IdP) |
| `POST` | `/v1/auth/saml/:tenantId/callback` | none | ACS endpoint — IdP posts SAML response here, returns JWT |
| `PATCH` | `/v1/admin/tenants/:id/saml` | none | Configure IdP settings (entity ID, SSO URL, certificate) |

### ERP connectors

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/v1/connectors/configure` | API key / JWT | Configure ERP connector for tenant |
| `GET` | `/v1/connectors/health` | API key / JWT | Health check active connector |
| `POST` | `/v1/connectors/match` | API key / JWT | Match a `nomination_ref` against ERP |
| `GET` | `/v1/sdf/:id/erp-status` | API key / JWT | Query ERP document status |
| `POST` | `/v1/sdf/:id/push-to-erp` | API key / JWT | Manually push uploaded document to ERP |

### Health checks (no auth)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness — always `200 { status: "ok" }` |
| `GET` | `/health/ready` | Readiness — checks DB connectivity |

---

## Database schema

The Drizzle schema is exported from `@etapsky/sdf-server-core/db/schema`:

```typescript
import {
  tenants,      // Tenant
  apiKeys,      // API key per tenant
  sdfDocuments, // Uploaded SDF document records
  auditLog,     // Append-only audit trail
} from '@etapsky/sdf-server-core/db/schema'
```

Run migrations with `drizzle-kit push` from the `sdf-server-core` package directory (requires `DATABASE_URL` in environment).

---

## Design decisions

**Factory function, not singleton server.** `buildServer()` returns a new Fastify instance each time — the calling application owns lifecycle (listen, close, graceful shutdown). This makes the package testable in isolation and reusable across multiple deployment topologies without global state.

**`registerExtraRoutes` hook.** Rather than exporting a plugin registry or route array, `buildServer()` accepts a single async callback that receives the Fastify instance directly. This gives SaaS layers full access to Fastify's plugin system (scoped prefixes, decorators, hooks) without any indirection or additional abstraction.

**No AWS SDK.** The S3 adapter uses `fetch` + AWS Signature V4 implemented directly. This eliminates the `@aws-sdk/client-s3` dependency tree (~3 MB) while remaining compatible with AWS S3, MinIO, Cloudflare R2, and any S3-compatible store.

**Two ioredis connections.** BullMQ bundles its own internal copy of `ioredis`. The application-level `redis` connection and the BullMQ worker connections are kept separate to avoid type conflicts between the two copies in `node_modules`.

**Audit log is fire-and-forget.** `writeAudit()` catches and logs all errors internally — an audit write failure never propagates to the main request flow. Audit correctness is best-effort by design; reliability of business operations takes priority.

**API key salt.** API keys are stored as `SHA-256(salt + rawKey)`. The `API_KEY_SALT` must be at least 32 characters and must be treated as a secret. If compromised, all existing keys must be rotated.

---

## License

BUSL-1.1 — Copyright (c) 2026 Yunus YILDIZ

This software is licensed under the [Business Source License 1.1](../../LICENSE).
Non-production use is free. Commercial use requires a license from the author until the Change Date (2030-03-17), after which it converts to Apache License 2.0.
