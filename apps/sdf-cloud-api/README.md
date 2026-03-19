# @etapsky/sdf-cloud-api

Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

Hosted SDF API — sdf-server + billing, onboarding, multi-tenant SaaS.

## Setup

Uses same `.env` as sdf-server. Copy from `../sdf-server/` or use `docker-compose` for MinIO.

```bash
npm install
npm run dev
```

## Endpoints

- `POST /v1/auth/signup` — Create tenant + API key
- `GET /v1/billing/usage` — Usage (auth required)
- `GET /v1/billing/plans` — Plan limits
- All `sdf-server` routes under `/v1/`

## Tests

```bash
npm test
```
