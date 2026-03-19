# @etapsky/sdf-cli

> SDF command-line tool — inspect, validate, convert, wrap, sign, verify, and schema operations.

[![npm](https://img.shields.io/npm/v/@etapsky/sdf-cli)](https://www.npmjs.com/package/@etapsky/sdf-cli)
[![License: BUSL-1.1](https://img.shields.io/badge/License-BUSL--1.1-blue.svg)](LICENSE)

Part of the [Etapsky SDF](https://github.com/etapsky/sdf) monorepo.

---

## Installation

```bash
npm install -g @etapsky/sdf-cli
```

Or run without installing:

```bash
npx @etapsky/sdf-cli inspect invoice.sdf
```

---

## Commands

### `sdf inspect <file.sdf>`

Full inspection report — meta, schema summary, data tree, layer sizes. Data values are color-coded: UUIDs in magenta, dates in amber, numbers in teal, monetary amounts inline (`24.00 EUR`).

```bash
sdf inspect invoice.sdf
```

**Output:**

```
  SDF — Smart Document Format  @etapsky/sdf-cli
────────────────────────────────────────────────────────────
  inspect  invoice.sdf
────────────────────────────────────────────────────────────
  ·  File size: 5.8 KB
  ✓  Archive structure   valid
  ✓  meta.json           valid
  ✓  schema.json         valid JSON Schema
  ✓  data.json           valid against schema
  ✓  visual.pdf          present (3.8 KB)

  META.JSON
────────────────────────────────────────────────────────────
  sdf_version           0.1
  document_id           b144b9ec-6300-46df-b38c-fd87c969a718
  issuer                Acme Supplies GmbH (DE123456789)
  recipient             Global Logistics AG (CH-123.456.789)
  created_at            2026-03-16T14:17:07.246Z
  document_type         invoice
  schema_id             https://etapsky.github.io/sdf/schemas/invoice/v0.1.json
  tags                  q1-2026, key-account
  signature             [none]

  SCHEMA.JSON
────────────────────────────────────────────────────────────
  title                 SDF Invoice
  required              [document_type, invoice_number, issue_date, ...]
  properties            12 fields defined

  DATA.JSON
────────────────────────────────────────────────────────────
  document_type         invoice
  invoice_number        INV-2026-00142
  line_items [2]
    unit_price          24.00 EUR
    subtotal            1200.00 EUR
  totals
    gross               1713.60 EUR
────────────────────────────────────────────────────────────
  ✓  invoice.sdf is a valid SDF 0.1 document
```

---

### `sdf validate <file.sdf>`

Validates archive structure, `meta.json`, `schema.json`, and `data.json`.

Designed for CI pipelines — prints a clean pass/fail report and exits with the appropriate code.

```bash
sdf validate invoice.sdf
# exit 0 = valid

sdf validate broken.sdf
# exit 1 = invalid, error code + message printed

# Silent mode — exit code only, no output
sdf validate invoice.sdf --quiet && echo "valid" || echo "invalid"
```

**Exit codes:**

| Code | Meaning |
|---|---|
| `0` | File is a valid SDF document |
| `1` | Validation failed — see stderr for error code and message |

**CI example:**

```yaml
- name: Validate SDF output
  run: sdf validate dist/invoice.sdf --quiet
```

---

### `sdf convert`

Converts a JSON data file + JSON Schema into a `.sdf` archive, generating `visual.pdf` automatically.

```bash
sdf convert \
  --data     invoice.json \
  --schema   invoice.schema.json \
  --issuer   "Acme Supplies GmbH" \
  --out      invoice.sdf
```

**All flags:**

| Flag | Required | Description |
|---|---|---|
| `--data` | ✓ | Path to `data.json` — must conform to `--schema` |
| `--schema` | ✓ | Path to `schema.json` — JSON Schema Draft 2020-12 |
| `--issuer` | ✓ | Issuing entity name (written to `meta.json`) |
| `--out` | ✓ | Output `.sdf` file path |
| `--issuer-id` | | Machine-readable issuer ID (VAT, GLN, UUID) |
| `--document-type` | | E.g. `invoice`, `nomination`, `gov_permit` |
| `--recipient` | | Recipient name |
| `--recipient-id` | | Machine-readable recipient ID |
| `--schema-id` | | Override schema `$id` in `meta.json` |

**Example — convert spec examples to .sdf:**

```bash
sdf convert \
  --data     spec/examples/invoice/data.json \
  --schema   spec/examples/invoice/schema.json \
  --issuer   "Acme Supplies GmbH" \
  --issuer-id "DE123456789" \
  --document-type invoice \
  --recipient "Global Logistics AG" \
  --out      output/invoice.sdf
```

---

### `sdf wrap <file.pdf>`

Wraps an existing PDF into a valid `.sdf` container. The PDF becomes `visual.pdf` — no structured data is extracted from it.

Use this to bring existing PDFs into the SDF ecosystem. The resulting file can be opened in SDF Reader or any ZIP tool. `data.json` will contain a stub indicating the file was wrapped rather than produced with structured data.

```bash
sdf wrap document.pdf \
  --issuer "Acme Corp" \
  --out    document.sdf
```

**All flags:**

| Flag | Required | Description |
|---|---|---|
| `<file.pdf>` | ✓ | Path to the input PDF file |
| `--issuer` | ✓ | Issuing entity name (written to `meta.json`) |
| `--out` | ✓ | Output `.sdf` file path |
| `--issuer-id` | | Machine-readable issuer ID |
| `--document-type` | | Document type label (default: `wrapped_pdf`) |
| `--recipient` | | Recipient name |
| `--recipient-id` | | Machine-readable recipient ID |

**Output:**

```
  SDF — Smart Document Format  @etapsky/sdf-cli
────────────────────────────────────────────────────────────
  wrap  document.pdf  →  document.sdf
────────────────────────────────────────────────────────────
  ·  Reading PDF: document.pdf
  ·  PDF size:    142.3 KB
  ·  Packing SDF...
  ✓  SDF file written

  output        document.sdf
  size          145.1 KB  (PDF: 142.3 KB)
  issuer        Acme Corp
  document_id   f47ac10b-58cc-4372-a567-0e02b2c3d479
  data layer    stub only — no structured data extracted
────────────────────────────────────────────────────────────
  ✓  document.sdf created
     Open in SDF Reader to view the PDF. Structured data panel will show a notice.
```

---

### `sdf keygen`

Generates an SDF signing key pair and writes two files to disk:
- `<out>.private.b64` — Base64-encoded PKCS#8 private key (keep secret)
- `<out>.public.b64` — Base64-encoded SPKI public key (distribute to recipients)

```bash
sdf keygen --algorithm ECDSA --out mykey
# → mykey.private.b64
# → mykey.public.b64
```

| Flag | Required | Description |
|---|---|---|
| `--algorithm` | | `ECDSA` (default, P-256) or `RSASSA-PKCS1-v1_5` (RSA-2048) |
| `--out` | ✓ | Base path for output files |

**Never commit `*.private.b64` to version control.**

---

### `sdf sign <file.sdf>`

Signs an SDF archive with a private key. Adds `signature.sig` to the archive and updates `meta.json` with `signature_algorithm` and `signed_at`.

```bash
sdf sign invoice.sdf \
  --key  mykey.private.b64 \
  --out  invoice.signed.sdf
```

| Flag | Required | Description |
|---|---|---|
| `<file.sdf>` | ✓ | SDF archive to sign |
| `--key` | ✓ | Path to Base64 private key file |
| `--out` | ✓ | Output `.sdf` path |
| `--algorithm` | | `ECDSA` (default) or `RSASSA-PKCS1-v1_5` |
| `--include-pdf` | | Include `visual.pdf` in signed content |

**Signed content** covers `data.json` + `schema.json` + `meta.json` by default. Use `--include-pdf` to also sign `visual.pdf` — note that this means replacing the PDF will invalidate the signature.

---

### `sdf verify <file.sdf>`

Verifies the digital signature of an SDF archive. CI-friendly — exits 0 on valid, 1 on invalid.

```bash
sdf verify invoice.signed.sdf --key mykey.public.b64
sdf verify invoice.signed.sdf --key mykey.public.b64 --quiet && echo "verified"
```

| Flag | Required | Description |
|---|---|---|
| `<file.sdf>` | ✓ | Signed SDF archive |
| `--key` | ✓ | Path to Base64 public key file |
| `--algorithm` | | `ECDSA` (default) or `RSASSA-PKCS1-v1_5` |
| `--quiet` | | Exit code only, no output |

**Tamper detection:** If `data.json`, `schema.json`, or `meta.json` has been modified after signing, the content digest mismatch is detected and reported before even attempting signature verification.

---

### `sdf schema`

Schema registry operations — list registered schemas, compare versions, validate data.

#### `sdf schema list`

Lists all schemas in the local registry.

```bash
sdf schema list
sdf schema list --type invoice
sdf schema list --registry registry.json
```

#### `sdf schema versions`

Lists all versions for a specific document type, newest first.

```bash
sdf schema versions --type invoice
sdf schema versions --type invoice --registry registry.json
```

#### `sdf schema diff`

Computes the structural diff between two JSON Schema files or URLs. Classifies each change as breaking or non-breaking per SDF_FORMAT.md Section 7.2. Exits 1 if any breaking change is detected — useful in CI to gate schema releases.

```bash
sdf schema diff --from v0.1.schema.json --to v0.2.schema.json
sdf schema diff \
  --from https://etapsky.github.io/sdf/schemas/invoice/v0.1.json \
  --to   https://etapsky.github.io/sdf/schemas/invoice/v0.2.json
```

**Exit codes:** `0` = no breaking changes · `1` = breaking changes detected

**CI gate example:**

```yaml
- name: Schema compatibility check
  run: sdf schema diff --from schemas/invoice.v0.1.json --to schemas/invoice.v0.2.json
```

**Breaking change types detected:**

| Change | Breaking |
|---|---|
| Required field added | ✓ |
| Field removed | ✓ |
| Field type changed | ✓ |
| `minLength` tightened | ✓ |
| `const` changed | ✓ |
| `additionalProperties` closed | ✓ |
| Optional field added | ✗ |
| Required field made optional | ✗ |
| `minLength` relaxed | ✗ |
| Title changed | ✗ |

#### `sdf schema validate`

Validates a `data.json` file against a `schema.json`. CI-friendly — exits 0 on valid, 1 on invalid.

```bash
sdf schema validate \
  --data   invoice.json \
  --schema invoice.schema.json

sdf schema validate --data invoice.json --schema invoice.schema.json --quiet
```

---

## Global flags

| Flag | Short | Description |
|---|---|---|
| `--help` | `-h` | Print help and exit |
| `--version` | `-v` | Print version and exit |
| `--quiet` | `-q` | Suppress output — exit code only (`validate`, `verify`, `schema validate`) |

---

## Error codes

All errors follow the canonical SDF error code registry from `SDF_FORMAT.md` Section 12.1:

| Code | Trigger |
|---|---|
| `SDF_ERROR_NOT_ZIP` | File is not a valid ZIP archive |
| `SDF_ERROR_INVALID_META` | `meta.json` is absent, invalid, or missing required fields |
| `SDF_ERROR_MISSING_FILE` | A required file is absent from the archive |
| `SDF_ERROR_SCHEMA_MISMATCH` | `data.json` fails validation against `schema.json` |
| `SDF_ERROR_INVALID_SCHEMA` | `schema.json` is not a valid JSON Schema document |
| `SDF_ERROR_UNSUPPORTED_VERSION` | `sdf_version` exceeds the supported maximum |
| `SDF_ERROR_INVALID_SIGNATURE` | `signature.sig` is absent or corrupt |
| `SDF_ERROR_INVALID_ARCHIVE` | Archive contains path traversal or unexpected files |
| `SDF_ERROR_ARCHIVE_TOO_LARGE` | Archive exceeds size limits |

---

## How it works

`sdf-cli` is a thin command router built on top of `@etapsky/sdf-kit`. It adds no parsing or validation logic of its own — all SDF operations delegate to the kit. `sdf wrap` is the only command that works directly with JSZip, since wrapping a plain PDF bypasses the kit's producer flow (there is no structured data to validate).

```
src/
├── index.ts              ← Entry point, arg parser, command router
├── commands/
│   ├── inspect.ts        ← parseSDF() → formatted report
│   ├── validate.ts       ← parseSDF() → exit 0/1
│   ├── convert.ts        ← buildSDF() → .sdf file
│   ├── wrap.ts           ← JSZip → stub .sdf from plain PDF
│   ├── keygen.ts         ← generateSDFKeyPair() → key files
│   ├── sign.ts           ← signSDF() → signed .sdf
│   ├── verify.ts         ← verifySig() → exit 0/1
│   └── schema.ts         ← SchemaRegistry + diffSchemas → schema ops
└── ui/
    ├── print.ts          ← ANSI colors — no external dependency
    └── table.ts          ← Terminal table renderer
```

**No external CLI framework** (no Commander, no Yargs). Argument parsing is hand-rolled — the CLI is simple enough that a framework would add more weight than value.

**ANSI colors** are implemented with raw escape codes in `ui/print.ts` — no `chalk`, no `kleur`, no external dependency.

---

## Development

```bash
cd packages/sdf-cli
npm install
npm run build
node dist/index.js --help

npm run dev  # watch mode
```

---

## Specification

The normative format specification is at [`spec/SDF_FORMAT.md`](https://github.com/etapsky/sdf/blob/main/spec/SDF_FORMAT.md).

---

## License

BUSL-1.1 — Copyright (c) 2026 Yunus YILDIZ

This software is licensed under the [Business Source License 1.1](../../LICENSE).
Non-production use is free. Commercial use requires a license from the author until the Change Date (2030-03-17), after which it converts to Apache License 2.0.
