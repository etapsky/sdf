# CLAUDE.md — Etapsky / SDF Project Context

> This file is the authoritative context source for Claude Code.
> Read it fully before writing any code, creating any file, or making
> any architectural decision in this repository.

---

## What this project is

**SDF (Smart Document Format)** is an open, language-agnostic file format
that combines a human-readable visual layer (PDF) with a machine-readable
structured data layer (JSON) inside a single file.

The core problem it solves: today, documents travel as PDFs and the
receiving system must OCR or manually re-key the data. SDF eliminates
this by carrying structured JSON alongside the visual — when both sides
use SDF, data extraction is zero-cost and zero-error.

SDF is **general purpose** — invoices, nominations, purchase orders,
government forms, G2G data exchange, HR documents, contracts. It makes
no assumptions about the parties involved (B2B, B2G, G2G all supported)
or the industry vertical.

The project is developed by **Etapsky Inc.** under the GitHub organization
`github.com/etapsky`. This repository (`etapsky/sdf`) is the main
Turborepo monorepo containing the spec, core kit, CLI, server, and demo
applications.

The full format specification lives at `spec/SDF_FORMAT.md`. Read it
before implementing anything that touches file structure, producer flow,
consumer flow, or validation.

---

## Current phase: F1 — Spec & Prototype

We are in **Phase 1**. The deliverables for this phase are:

- `spec/SDF_FORMAT.md` — format specification (exists, authoritative)
- `spec/schemas/meta.schema.json` — JSON Schema for meta.json
- `spec/schemas/data.schema.json` — base JSON Schema for data.json
- `spec/examples/` — example .sdf files for different document types
- A hand-crafted proof-of-concept `.sdf` file (Node.js or Python script)
- A proof-of-concept reader that unpacks and validates an `.sdf` file

**Do not start F2 work** (sdf-kit NPM package, producer/reader modules)
until F1 deliverables are complete and reviewed.

---

## ⚠️ Open design decision — container format

**The container format has NOT been finalized.** Do not treat the ZIP
approach as locked. Do not write production code that depends on a
specific container mechanism until this decision is closed.

### Options under consideration

| Option | Description | Status |
|---|---|---|
| **ZIP archive** | `.sdf` = ZIP, files at root. Current spec default. | Leading candidate |
| **QR / token in PDF** | PDF carries a lookup key; data lives externally or in PDF metadata | Under evaluation |
| **PDF metadata embed** | JSON in XMP or /DocumentInfo block; single file, no ZIP | Under evaluation |
| **PDF/A-3 attachment** | ZUGFeRD-style embedded attachment inside PDF | Under evaluation |

### Trade-offs to keep in mind

- ZIP: universal tooling, offline-safe, no parser coupling, proven by DOCX/XLSX.
  Downside: not a "normal" file to non-technical users.
- QR/token: familiar UX, single PDF. Downside: requires network for data
  retrieval, breaks offline workflows (government, air-gapped systems).
- PDF metadata: single file, no ZIP tooling needed. Downside: size limits,
  non-standard, parser coupling to PDF layer.
- PDF attachment: ZUGFeRD already does this. Downside: requires PDF/A-3,
  complex to implement, XML-centric ecosystem.

**When writing code or spec content that depends on the container:**
mark it with `// TODO: container-decision` and implement against an
abstraction layer (`packContainer` / `unpackContainer`) rather than
calling JSZip directly. This makes the container swappable.

---

## Repository structure

```
etapsky/sdf/                          ← repo root
├── CLAUDE.md                         ← you are here
├── spec/                             ← format specification (read-only reference)
│   ├── README.md
│   ├── SDF_FORMAT.md                 ← authoritative spec, read before coding
│   ├── CHANGELOG.md
│   ├── schemas/
│   │   ├── meta.schema.json          ← normative schema for meta.json
│   │   └── data.schema.json          ← base schema for data.json
│   └── examples/
│       ├── README.md
│       ├── invoice/
│       ├── nomination/
│       ├── purchase-order/
│       ├── gov-tax-declaration/
│       ├── gov-customs-declaration/
│       └── gov-permit-application/
├── packages/                         ← NPM packages (F2+)
│   ├── sdf-kit/                      ← @etapsky/sdf-kit — core library
│   ├── sdf-cli/                      ← @etapsky/sdf-cli — CLI tool
│   ├── sdf-server/                   ← @etapsky/sdf-server — REST API + queue
│   └── sdf-schema-registry/          ← @etapsky/sdf-schema-registry
├── apps/                             ← deployed applications (F3+)
│   ├── demo-web/                     ← React form + SDF producer (Vite, Vercel)
│   ├── demo-reader/                  ← SDF viewer, drag & drop
│   ├── playground/                   ← live editor
│   └── docs-site/                    ← Docusaurus documentation
└── tooling/                          ← shared dev infrastructure
```

---

## Technology stack

### Core kit (`sdf-kit`)

| Technology | Role | Notes |
|---|---|---|
| TypeScript | Primary language | Strict mode required. No `any`. |
| pdf-lib | PDF generation (browser + Node.js) | Default PDF engine. |
| pdfkit | Alternative PDF engine | Only for complex layout templates. |
| JSZip | ZIP container | Wrapped behind `packContainer`/`unpackContainer` abstraction due to open container decision. |
| ajv | JSON Schema validation | Version 8 only. JSON Schema Draft 2020-12. |
| node-forge | Digital signing (Phase 4) | Do not use in F1/F2/F3. |
| Web Crypto API | Browser-side crypto (Phase 4) | Do not use in F1/F2/F3. |
| Zod | TypeScript runtime validation | For internal API boundaries only, not for SDF schema validation (use ajv for that). |

### Backend (`sdf-server`)

| Technology | Role |
|---|---|
| Node.js 20 LTS | Runtime. LTS only — do not use Node 21 or 23. |
| Fastify | Preferred over Express for new endpoints. |
| BullMQ | Job queue. Redis backend. |
| Redis | Queue backend and cache. |
| PostgreSQL | Metadata, audit log, nomination records. |
| S3 / MinIO | SDF file object storage. |
| OpenTelemetry | Distributed tracing and observability. |

### Frontend

| Technology | Role |
|---|---|
| React 18+ | UI framework. |
| React Hook Form | Form state. Do not use Formik. |
| Zod | Form validation schema — keep in sync with sdf-kit schemas. |
| Vite | Build tool. Do not use webpack or CRA. |

### Monorepo tooling

| Technology | Role |
|---|---|
| Turborepo | Task pipeline, remote cache, affected builds. |
| Changesets | Semver management, npm publish automation. |
| Vitest | Unit and integration tests. |
| Playwright | End-to-end tests. |
| GitHub Actions | CI/CD pipeline. |

---

## Critical design decisions (already locked)

These decisions are final. Do not reopen them without an explicit spec
version bump discussion.

### 1. JSON over XML
`data.json` and `schema.json` are JSON. Never XML. This is a core
differentiator from ZUGFeRD/XRechnung.

### 2. Schema travels with the document
`schema.json` MUST be bundled inside every SDF file. Never rely on
external URIs for validation. Documents must be self-validating
decades after creation.

### 3. meta.json is separate from data.json
SDF-level metadata (identity, version, provenance) lives in `meta.json`.
Business data lives in `data.json`. Never mix them. This allows
`meta.json` to evolve independently of document schemas.

### 4. document_id is a UUID v4 generated at production time
`document_id` is NOT derived from business identifiers like invoice
numbers. It is a fresh UUID v4 generated when the SDF file is produced.
Business identifiers (invoice_number, nomination_ref, etc.) live in
`data.json` and are indexed separately.

### 5. monetary amounts are strings, not numbers
```json
{ "amount": "1250.00", "currency": "EUR" }
```
Never `{ "total": 1250.00 }`. Floating-point precision loss is
unacceptable in financial documents.

### 6. All resources embedded in visual.pdf
`visual.pdf` MUST NOT reference external URLs for fonts, images, or
color profiles. Everything embedded. Offline-safe by design.

### 7. No executable content in visual.pdf
No JavaScript, no macros, no AcroForm scripts. Producers MUST NOT
embed them. Consumers MUST NOT execute anything found in the PDF.

---

## What lives where — rules

| Data type | Correct location | Wrong location |
|---|---|---|
| SDF spec version | `meta.json` → `sdf_version` | `data.json` |
| Document UUID | `meta.json` → `document_id` | `data.json` |
| Business data (invoice fields, etc.) | `data.json` | `meta.json` |
| Validation rules | `schema.json` | `data.json`, `meta.json` |
| Visual representation | `visual.pdf` | anywhere else |
| Digital signature | `signature.sig` (Phase 4 only) | `meta.json` value |
| Proprietary extensions | `vendor/` prefix | archive root |

---

## Error codes

All SDF operations MUST use these error codes. Do not invent new ones
without updating `spec/SDF_FORMAT.md` Section 12.

```
SDF_ERROR_NOT_ZIP
SDF_ERROR_INVALID_META
SDF_ERROR_MISSING_FILE
SDF_ERROR_SCHEMA_MISMATCH
SDF_ERROR_INVALID_SCHEMA
SDF_ERROR_UNSUPPORTED_VERSION
SDF_ERROR_INVALID_SIGNATURE      ← Phase 4 only
SDF_ERROR_INVALID_ARCHIVE
SDF_ERROR_ARCHIVE_TOO_LARGE
```

---

## Quality and safety rules

- **TypeScript strict mode** on all packages. `"strict": true` in tsconfig.
  No `any`, no `@ts-ignore` without a documented reason.
- **Test coverage ≥ 80%** line and branch coverage enforced in CI.
- **Vitest** for unit and integration tests. **Playwright** for e2e.
- **Never write partial SDF files to disk.** Validate fully before
  writing. An incomplete `.sdf` file on disk is worse than no file.
- **ZIP bomb protection** in all consumer implementations. Max 50 MB
  per file, 200 MB total uncompressed. Reject with
  `SDF_ERROR_ARCHIVE_TOO_LARGE`.
- **Path traversal check** on all ZIP entry paths before extraction.
  Reject `..` components with `SDF_ERROR_INVALID_ARCHIVE`.
- **No network requests** during SDF parse or validation. The library
  must work fully offline.

---

## Anti-patterns — never do these

```typescript
// ❌ Do not call JSZip directly — use the container abstraction
const zip = new JSZip();

// ❌ Do not put business data in meta.json
meta.invoice_number = "INV-001";

// ❌ Do not put SDF metadata in data.json
data.sdf_version = "0.1";

// ❌ Do not validate against external schema URIs
ajv.addSchema(await fetch("https://example.com/schema.json"));

// ❌ Do not represent monetary amounts as numbers
{ "total": 1250.50 }

// ❌ Do not write files before full validation passes
fs.writeFileSync("output.sdf", zipBuffer); // before validateSchema()

// ❌ Do not use any in TypeScript
const data: any = parseSDF(buffer);

// ❌ Do not embed executable content in visual.pdf
// (no JS, no macros, no AcroForm scripts)
```

---

## Correct patterns

```typescript
// ✅ Use the container abstraction
import { packContainer, unpackContainer } from './core/container';

// ✅ Keep meta and data separate
const meta: SDFMeta = { sdf_version, document_id, issuer, created_at };
const data: InvoiceData = { invoice_number, line_items, totals };

// ✅ Validate before writing
const result = validateSchema(data, schema);
if (!result.valid) throw new SDFValidationError(result.errors);
const buffer = await packContainer({ meta, data, schema, pdfBytes });

// ✅ Monetary amounts as strings
{ "amount": "1250.00", "currency": "EUR" }

// ✅ Dates as ISO 8601 strings
{ "issue_date": "2026-03-15" }

// ✅ UUIDs for global identifiers
{ "document_id": crypto.randomUUID() }
```

---

## Phase 4 — do not implement yet

The following are reserved for Phase 4 and MUST NOT be implemented
in F1, F2, or F3:

- `signature.sig` — digital signature file
- `node-forge` — any usage
- `Web Crypto API` — any usage for signing
- `signature_algorithm` field in meta.json (MAY be set to `null` as
  a forward-compatibility marker, but nothing more)
- Encryption of `data.json`
- Tenant management, SSO, SAML

---

## Spec reference

The normative source of truth for all format decisions is:

```
spec/SDF_FORMAT.md
```

If code behavior conflicts with the spec, the spec wins.
If the spec is ambiguous, open a GitHub issue before writing code.
Do not make judgment calls on format behavior — ask first.

---

*Etapsky Inc. · CLAUDE.md · v0.1 · 2026*
*Update this file when architecture decisions change.*