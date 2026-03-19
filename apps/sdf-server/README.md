# @etapsky/sdf-server

> SDF REST API server — production-ready document processing infrastructure for enterprise SDF workflows.

[![License: BUSL-1.1](https://img.shields.io/badge/License-BUSL--1.1-blue.svg)](../../LICENSE)

Part of the [Etapsky SDF](https://github.com/etapsky/sdf) monorepo · `apps/sdf-server/`

---

## What it is

`sdf-server` is a self-hostable REST API that brings SDF document processing to enterprise infrastructure. It handles the full lifecycle of SDF files — upload, validation, signing, storage, and webhook delivery — with multi-tenancy, audit logging, and SSO authentication built in.

It is not an npm library. It is a deployable application that runs inside your own infrastructure alongside your existing ERP systems, object storage, and identity providers.

---

## Why it exists

`@etapsky/sdf-kit` handles SDF file production and parsing in any Node.js or browser environment. But enterprise workflows need more than a library:

- Files must be stored durably and retrieved by document ID
- Every operation must be logged for compliance audit trails
- Multiple internal systems (ERP connectors, matching engines) need API access
- Access must be scoped per tenant with revocable API keys
- High-volume processing must be queued and retried automatically
- Signing must be offloaded from clients to a trusted server process

`sdf-server` provides all of this as a single deployable service.

---

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │              sdf-server                  │
                    │                                         │
  ERP / Client ────▶│  Fastify REST API  (v1/*)              │
  SAML IdP    ────▶│  Auth Middleware   (API key + JWT)      │
                    │  Rate Limiter      (per-tenant)         │
                    │         │                               │
                    │         ▼                               │
                    │  BullMQ Queue ──▶ Workers               │
                    │    validate-sdf     sign-sdf            │
                    │    webhook-delivery                     │
                    │         │                               │
                    └─────────┼───────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         PostgreSQL        S3/MinIO         Redis
         (metadata,       (.sdf files)    (queue)
          audit log,
          tenants,
          api keys)
```

### Technology stack

| Component | Technology | Role |
|---|---|---|
| HTTP server | Fastify 5 | REST API, request validation, middleware |
| ORM | Drizzle ORM | Type-safe PostgreSQL access, schema migrations |
| Queue | BullMQ 5 | Async job processing, retry, dead letter |
| Cache / Queue backend | Redis 7 / ioredis | BullMQ connection |
| Object storage | S3 / MinIO | `.sdf` file storage (native fetch + SigV4) |
| Database | PostgreSQL 16+ | Metadata, audit log, tenants, API keys |
| Validation | Zod | Environment config, request body validation |
| SDF processing | `@etapsky/sdf-kit` | `parseSDF()`, `buildSDF()`, `signSDF()`, `verifySig()` |
| Schema operations | `@etapsky/sdf-schema-registry` | Schema validation, diff, migration |

---

## REST API

All endpoints are prefixed with `/v1`. Authentication is required on all endpoints except `/health`.

### Authentication

Two methods are supported:

**API Key** (recommended for machine-to-machine):
```
Authorization: Bearer sdf_xxxxxxxxxxxxxxxx
```

**JWT** (issued after SAML SSO login):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

### SDF Document endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/sdf/upload` | Upload a `.sdf` file — validates, stores, enqueues |
| `GET` | `/v1/sdf` | List documents for the authenticated tenant |
| `GET` | `/v1/sdf/:id` | Download the `.sdf` file |
| `GET` | `/v1/sdf/:id/meta` | Return `meta.json` as JSON |
| `GET` | `/v1/sdf/:id/data` | Return `data.json` as JSON |
| `DELETE` | `/v1/sdf/:id` | Delete document and remove from storage |
| `POST` | `/v1/sdf/validate` | Validate a `.sdf` file without persisting |
| `POST` | `/v1/sdf/:id/sign` | Queue a signing job for a stored document |
| `POST` | `/v1/sdf/:id/verify` | Verify the signature of a signed document |

### Schema endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/v1/schemas` | List all registered schemas |
| `GET` | `/v1/schemas/:type` | List versions for a document type |
| `GET` | `/v1/schemas/:type/:version` | Get a specific schema |

### Admin endpoints (API key auth only)

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/admin/tenants` | Create a new tenant + initial API key |
| `GET` | `/v1/admin/tenants/:id` | Get tenant details |
| `PATCH` | `/v1/admin/tenants/:id` | Update tenant settings |
| `GET` | `/v1/admin/tenants/:id/keys` | List API keys |
| `POST` | `/v1/admin/tenants/:id/keys` | Create a new API key |
| `DELETE` | `/v1/admin/tenants/:id/keys/:keyId` | Revoke an API key |
| `GET` | `/v1/admin/tenants/:id/audit` | Audit log for a tenant |
| `PATCH` | `/v1/admin/tenants/:id/saml` | Configure SAML IdP settings |

### SAML SSO endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/v1/auth/saml/:tenantId/metadata` | SP metadata XML — provide to your IdP |
| `GET` | `/v1/auth/saml/:tenantId/login` | Initiate SSO login |
| `POST` | `/v1/auth/saml/:tenantId/callback` | ACS — IdP posts response here, returns JWT |

### Health endpoints (no auth)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `GET` | `/health/ready` | Readiness check — verifies DB connectivity |

---

## Multi-tenancy

Every resource (documents, API keys, audit entries) is scoped to a tenant. Tenants cannot access each other's data.

**Tenant isolation enforced at:**
- Every DB query — `WHERE tenant_id = ?`
- S3 key prefix — `{tenantId}/{documentId}.sdf`
- Rate limiting — per tenant ID, not per IP
- Audit log — every action recorded with `tenant_id`

**Tenant configuration per tenant:**
- `rate_limit` — requests per minute (default: 100, max: 10,000)
- `webhook_url` — event delivery endpoint
- `webhook_secret` — HMAC-SHA256 signing secret for webhook payloads
- SAML IdP settings — entity ID, SSO URL, certificate

---

## API Key security

- API keys are prefixed with `sdf_` for easy identification in logs and secret scanners
- Keys are hashed with SHA-256 + server-side salt before storage — the plain text key is shown **once** at creation and never stored
- Keys are stored in the `api_keys` table — one tenant can have multiple keys
- Each key can be independently revoked without affecting other keys
- Keys support optional expiry (`expires_at`)
- `last_used_at` is updated on every successful authentication

**Key format:** `sdf_` + 43 chars base64url = 47 chars total

---

## SAML 2.0 SSO

`sdf-server` implements the SAML 2.0 Service Provider (SP) role. It supports any SAML 2.0-compliant IdP (Okta, Azure AD, Google Workspace, ADFS, Keycloak, etc.).

**Setup flow:**
1. `PATCH /v1/admin/tenants/:id/saml` — configure IdP entity ID, SSO URL, and certificate
2. `GET /v1/auth/saml/:tenantId/metadata` — retrieve SP metadata XML
3. Register the SP metadata in your IdP
4. Users navigate to `GET /v1/auth/saml/:tenantId/login` → redirect to IdP → callback → JWT issued

**Post-login:** The ACS endpoint issues a signed HS256 JWT (8-hour TTL) scoped to the tenant. Machine systems continue to use API keys — SAML/JWT is for human operator access.

---

## Queue architecture

Three BullMQ queues handle async workloads:

| Queue | Job | Trigger | Processing |
|---|---|---|---|
| `sdf-validate` | `validate-sdf` | After upload | `parseSDF()` — verify archive integrity and schema |
| `sdf-sign` | `sign-sdf` | `POST /sdf/:id/sign` | `signSDF()` — CPU-bound, concurrency: 2 |
| `sdf-webhook` | `webhook-delivery` | After any document event | HTTP POST to tenant webhook URL |

**Retry policy:**
- `validate-sdf` — 3 attempts, exponential backoff from 1s
- `sign-sdf` — 2 attempts, fixed 2s delay
- `webhook-delivery` — 5 attempts, exponential backoff from 2s

Failed jobs move to the dead letter queue after exhausting retries. Failed webhook deliveries trigger an `audit_log` entry with action `webhook_failed`.

---

## Audit log

Every operation is recorded in `audit_log` with:

| Field | Description |
|---|---|
| `document_id` | Related SDF document (if applicable) |
| `tenant_id` | Tenant that performed the action |
| `action` | One of: `upload`, `download`, `validate`, `sign`, `verify`, `delete`, `webhook_delivered`, `webhook_failed`, `key_created`, `key_revoked`, `tenant_created`, `saml_login`, `jwt_issued` |
| `actor` | API key prefix or user email (from SAML assertion) |
| `ip` | Client IP address |
| `user_agent` | HTTP User-Agent header |
| `status_code` | HTTP response code |
| `metadata` | Action-specific JSON context |
| `timestamp` | UTC timestamp with timezone |

Audit log entries are never deleted — the table is append-only by convention. Retrieve via `GET /v1/admin/tenants/:id/audit`.

---

## Running locally

**Prerequisites:** Docker (MinIO only), Node.js 20+, PostgreSQL 16+, Redis 7+

> PostgreSQL and Redis run natively. Only MinIO runs in Docker.

**1. Start MinIO:**

```bash
cd apps/sdf-server
docker-compose up -d
# Starts MinIO on :9000 (S3 API) and :9001 (Console)
# Bucket 'sdf-documents' is created automatically by minio-init
```

**2. Configure environment:**

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL, REDIS_URL, and API_KEY_SALT (min 32 chars)
```

**3. Push DB schema:**

```bash
npm run db:push
```

**4. Start server:**

```bash
npm run dev
```

**5. Verify:**

```bash
curl http://localhost:3000/health
# {"status":"ok","version":"0.1.0","timestamp":"..."}
```

---

## Deploying to production

`sdf-server` is a standard Node.js application. It can be deployed as:

- A Docker container (`node:22-alpine` base image recommended)
- A systemd service
- A Kubernetes Deployment

**Minimum required environment variables for production:**

```
DATABASE_URL         ← PostgreSQL connection string
REDIS_URL            ← Redis connection string
S3_BUCKET            ← S3 bucket name
S3_REGION            ← AWS region or MinIO region
S3_ACCESS_KEY_ID     ← Access key
S3_SECRET_ACCESS_KEY ← Secret key
API_KEY_SALT         ← 32+ char random string — never change after first deploy
NODE_ENV=production
```

**Production checklist:**
- `API_KEY_SALT` must be set before any tenants are created — changing it invalidates all existing API keys
- `DATABASE_URL` should use a connection pooler (PgBouncer) at scale
- Redis should be configured with persistence (`appendonly yes`)
- S3 bucket should have versioning enabled for document recovery
- Set `CORS_ORIGIN` to your actual frontend domain, not `*`

---

## Database schema

### `tenants`
Core tenant record. One row per organization. Holds rate limit settings, webhook configuration, and SAML IdP metadata.

### `api_keys`
API keys for machine-to-machine authentication. Multiple keys per tenant. Each key stores only the SHA-256 hash — plain text is never persisted.

### `sdf_documents`
Metadata index for every uploaded SDF file. The file itself lives in S3 at key `{tenantId}/{documentId}.sdf`.

### `audit_log`
Immutable append-only log of every operation. Never deleted.

---

## Source structure

```
src/
├── index.ts              ← Bootstrap: Redis connect, workers start, Fastify listen
├── config/
│   └── env.ts            ← Zod-validated environment config — fails fast on startup
├── db/
│   ├── schema.ts         ← Drizzle schema — tenants, api_keys, sdf_documents, audit_log
│   └── client.ts         ← PostgreSQL pool + writeAudit() helper
├── storage/
│   └── s3.ts             ← S3/MinIO adapter — native fetch + AWS Signature V4
├── queue/
│   ├── client.ts         ← Redis connection (URL-based for BullMQ compatibility)
│   └── jobs.ts           ← Queue definitions + Worker processors
├── middleware/
│   └── auth.ts           ← API key + JWT auth, generateApiKey(), signJWT(), verifyJWT()
├── routes/
│   ├── sdf.ts            ← Upload, download, list, delete, meta, data
│   ├── sign.ts           ← Sign (async) + verify (sync)
│   ├── validate.ts       ← Validate without persisting
│   ├── schema.ts         ← Schema registry read endpoints
│   ├── admin.ts          ← Tenant + API key management
│   └── saml.ts           ← SAML 2.0 SP — metadata, login, callback, IdP config
└── api/
    └── server.ts         ← Fastify instance, plugins, route registration, error handler
```

---

## Relationship to other packages

```
apps/sdf-server
    ├── imports @etapsky/sdf-kit             ← parseSDF, signSDF, verifySig
    ├── imports @etapsky/sdf-schema-registry ← SchemaRegistry, diffSchemas
    └── is NOT published to npm              ← deployed, not imported
```

`sdf-server` lives in `packages/` but is a deployable application, not a reusable library. It shares the monorepo for workspace linking — local changes to `sdf-kit` are immediately available without publishing to npm.

---

## Specification

The normative SDF format specification is at [`spec/SDF_FORMAT.md`](https://github.com/etapsky/sdf/blob/main/spec/SDF_FORMAT.md).

---

## License

BUSL-1.1 — Copyright (c) 2026 Yunus YILDIZ

This software is licensed under the [Business Source License 1.1](../../LICENSE).
Non-production use is free. Commercial use requires a license from the author until the Change Date (2030-03-17), after which it converts to Apache License 2.0.
