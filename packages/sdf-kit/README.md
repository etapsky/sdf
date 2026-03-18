# @etapsky/sdf-kit

> SDF (Smart Document Format) core library — producer, reader, validator.

[![npm](https://img.shields.io/npm/v/@etapsky/sdf-kit)](https://www.npmjs.com/package/@etapsky/sdf-kit)
[![CI](https://github.com/etapsky/sdf/actions/workflows/ci.yml/badge.svg)](https://github.com/etapsky/sdf/actions/workflows/ci.yml)
[![License: BUSL-1.1](https://img.shields.io/badge/License-BUSL--1.1-blue.svg)](../../LICENSE)

SDF is an open file format that combines a human-readable PDF layer with a machine-readable JSON layer in a single file. `@etapsky/sdf-kit` is the reference implementation of the [SDF specification](https://github.com/etapsky/sdf/blob/main/spec/SDF_FORMAT.md).

---

## Installation

```bash
npm install @etapsky/sdf-kit
```

---

## Quick start

### Produce a `.sdf` file

```typescript
import { buildSDF } from '@etapsky/sdf-kit/producer';

const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['document_type', 'invoice_number'],
  properties: {
    document_type:  { type: 'string' },
    invoice_number: { type: 'string' },
    total: {
      type: 'object',
      properties: {
        amount:   { type: 'string' },
        currency: { type: 'string' },
      },
    },
  },
};

const data = {
  document_type:  'invoice',
  invoice_number: 'INV-2026-001',
  total: { amount: '1250.00', currency: 'EUR' },
};

const buffer = await buildSDF({
  data,
  schema,
  issuer:       'Acme Supplies GmbH',
  issuerId:     'DE123456789',
  documentType: 'invoice',
  recipient:    'Global Logistics AG',
  schemaId:     'https://example.com/schemas/invoice/v0.1.json',
});

// buffer is a ZIP archive with .sdf extension
// write to disk, send via API, attach to email — your choice
import { writeFile } from 'fs/promises';
await writeFile('invoice.sdf', buffer);
```

### Read and validate a `.sdf` file

```typescript
import { parseSDF } from '@etapsky/sdf-kit/reader';

const buffer = await readFile('invoice.sdf');
const { meta, data, schema, pdfBytes } = await parseSDF(buffer);

console.log(meta.document_id);   // UUID v4
console.log(meta.sdf_version);   // '0.1'
console.log(data.invoice_number); // 'INV-2026-001'
// pdfBytes — serve to a PDF viewer for human review
```

### Validate only (no PDF needed)

```typescript
import { extractJSON } from '@etapsky/sdf-kit/reader';

// Skips reading visual.pdf — faster for server-side ingestion
const { meta, data, schema } = await extractJSON(buffer);
```

### Validate a schema directly

```typescript
import { validateSchema } from '@etapsky/sdf-kit/validator';

const result = validateSchema(data, schema);
if (!result.valid) {
  console.error(result.errors);
}
```

---

## API

### Producer — `@etapsky/sdf-kit/producer`

#### `buildSDF(options): Promise<Buffer>`

Produces a `.sdf` file buffer from structured data.

| Option | Type | Required | Description |
|---|---|---|---|
| `data` | `Record<string, unknown>` | ✓ | Business data — must conform to `schema` |
| `schema` | `Record<string, unknown>` | ✓ | JSON Schema Draft 2020-12 |
| `issuer` | `string` | ✓ | Issuing entity name |
| `issuerId` | `string` | | Machine-readable issuer ID (VAT, GLN, UUID) |
| `documentType` | `string` | | E.g. `'invoice'`, `'nomination'`, `'gov_permit'` |
| `recipient` | `string` | | Recipient name |
| `recipientId` | `string` | | Machine-readable recipient ID |
| `schemaId` | `string` | | URI of the schema `$id` |
| `tags` | `string[]` | | Free-form tags for routing |

Throws `SDFError` with code `SDF_ERROR_SCHEMA_MISMATCH` if `data` does not conform to `schema`. Partial or invalid SDF files are never written.

---

### Reader — `@etapsky/sdf-kit/reader`

#### `parseSDF(buffer): Promise<SDFParseResult>`

Reads and validates a `.sdf` buffer. Returns all four layers.

```typescript
interface SDFParseResult {
  meta:     SDFMeta;
  data:     Record<string, unknown>;
  schema:   Record<string, unknown>;
  pdfBytes: Uint8Array;
}
```

#### `extractJSON(buffer): Promise<JSONOnlyResult>`

Partial read — extracts `meta`, `data`, `schema` without loading `visual.pdf`. Use for high-throughput server-side ingestion.

---

### Validator — `@etapsky/sdf-kit/validator`

#### `validateSchema(data, schema): SDFValidationResult`

Validates `data` against a JSON Schema Draft 2020-12 `schema`.

#### `validateMeta(meta): asserts meta is SDFMeta`

Validates a `meta.json` object against the normative SDF Meta Schema.

#### `checkVersion(sdfVersion): VersionCheckResult`

Checks SDF spec version compatibility. Throws `SDF_ERROR_UNSUPPORTED_VERSION` for unsupported major versions.

---

### Error handling

All errors are instances of `SDFError` with a standardised `code` field:

```typescript
import { parseSDF } from '@etapsky/sdf-kit/reader';
import { SDFError, SDF_ERRORS } from '@etapsky/sdf-kit';

try {
  const result = await parseSDF(buffer);
} catch (err) {
  if (err instanceof SDFError) {
    switch (err.code) {
      case SDF_ERRORS.NOT_ZIP:
        // file is not a ZIP archive
        break;
      case SDF_ERRORS.SCHEMA_MISMATCH:
        // data.json failed validation
        console.error(err.details); // array of validation errors
        break;
      case SDF_ERRORS.UNSUPPORTED_VERSION:
        // sdf_version in file is too new
        break;
    }
  }
}
```

#### Error codes

| Code | Trigger |
|---|---|
| `SDF_ERROR_NOT_ZIP` | File is not a valid ZIP archive |
| `SDF_ERROR_INVALID_META` | `meta.json` is absent, invalid, or missing required fields |
| `SDF_ERROR_MISSING_FILE` | A required file is absent from the archive |
| `SDF_ERROR_SCHEMA_MISMATCH` | `data.json` fails validation against `schema.json` |
| `SDF_ERROR_INVALID_SCHEMA` | `schema.json` is not a valid JSON Schema document |
| `SDF_ERROR_UNSUPPORTED_VERSION` | `sdf_version` exceeds the supported maximum |
| `SDF_ERROR_INVALID_ARCHIVE` | Archive contains path traversal or unexpected files |
| `SDF_ERROR_ARCHIVE_TOO_LARGE` | Archive exceeds size limits (50 MB per file, 200 MB total) |

---

## What is SDF?

A `.sdf` file is a ZIP archive containing:

```
invoice.sdf
├── visual.pdf    ← human-readable layer (any PDF viewer)
├── data.json     ← machine-readable layer
├── schema.json   ← validation rules
└── meta.json     ← identity and provenance
```

Any system that does not understand SDF can open the file with a ZIP tool and read `visual.pdf` as a normal PDF — full backward compatibility. Systems that understand SDF extract `data.json` directly, eliminating OCR and manual re-keying.

SDF is general purpose — invoices, nominations, purchase orders, government forms, health reports, contracts. See the [spec examples](https://github.com/etapsky/sdf/tree/main/spec/examples) for reference implementations across B2B and B2G scenarios.

---

## Environments

| Environment | Support |
|---|---|
| Node.js 20 LTS | Full |
| Node.js 22 LTS | Full |
| Browser (modern) | Full |
| Electron | Full |
| Deno | Planned (F3) |
| Bun | Planned (F3) |

---

## Specification

The normative format specification is at [`spec/SDF_FORMAT.md`](https://github.com/etapsky/sdf/blob/main/spec/SDF_FORMAT.md).

---

## License

BUSL-1.1 — Copyright (c) 2026 Yunus YILDIZ

This software is licensed under the [Business Source License 1.1](../../LICENSE).
Non-production use is free. Commercial use requires a license from the author until the Change Date (2030-03-17), after which it converts to Apache License 2.0.