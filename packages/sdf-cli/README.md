# @etapsky/sdf-cli

> SDF command-line tool — inspect, validate, and convert `.sdf` files.

[![npm](https://img.shields.io/npm/v/@etapsky/sdf-cli)](https://www.npmjs.com/package/@etapsky/sdf-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Part of the [Etapsky SDF](https://github.com/etapsky/sdf) monorepo · F3 deliverable.

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

Full inspection report — meta, schema summary, data tree, layer sizes.

```
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
  signature             [none — Phase 4]

  SCHEMA.JSON
────────────────────────────────────────────────────────────
  title                 SDF Invoice
  required              [document_type, invoice_number, issue_date, ...]
  properties            12 fields defined

  DATA.JSON
────────────────────────────────────────────────────────────
  document_type         invoice
  invoice_number        INV-2026-00142
  issue_date            2026-03-15
  issuer
    name                Acme Supplies GmbH
    ...
  line_items [2]
    unit_price          24.00 EUR
    subtotal            1200.00 EUR
    … +1 more
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

Converts a JSON data file and JSON Schema into a `.sdf` archive, generating `visual.pdf` automatically.

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

## Global flags

| Flag | Short | Description |
|---|---|---|
| `--help` | `-h` | Print help and exit |
| `--version` | `-v` | Print version and exit |
| `--quiet` | `-q` | Suppress output — exit code only (validate only) |

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
| `SDF_ERROR_INVALID_ARCHIVE` | Archive contains path traversal or unexpected files |
| `SDF_ERROR_ARCHIVE_TOO_LARGE` | Archive exceeds size limits |

---

## How it works

`sdf-cli` is a thin command router built on top of `@etapsky/sdf-kit`. It adds no parsing or validation logic of its own — all SDF operations delegate to the kit.

```
src/
├── index.ts              ← Entry point, arg parser, command router
├── commands/
│   ├── inspect.ts        ← Full report — calls parseSDF(), formats output
│   ├── validate.ts       ← CI-friendly — calls parseSDF(), exits 0 or 1
│   └── convert.ts        ← Reads JSON files, calls buildSDF(), writes .sdf
└── ui/
    ├── print.ts          ← ANSI color helpers, no external dependency
    └── table.ts          ← Terminal table renderer
```

**No external CLI framework** (no Commander, no Yargs). Argument parsing is hand-rolled — the CLI is simple enough that a framework would add more weight than value.

**ANSI colors** are implemented with raw escape codes in `ui/print.ts` — no `chalk`, no `kleur`, no external dependency.

---

## Development

```bash
cd packages/sdf-cli
npm install
npm run build          # compile TypeScript → dist/
node dist/index.js --help

# During development — watch mode
npm run dev
```

---

## Specification

The normative format specification is at [`spec/SDF_FORMAT.md`](https://github.com/etapsky/sdf/blob/main/spec/SDF_FORMAT.md).

---

*@etapsky/sdf-cli · F3 · Etapsky Inc. · github.com/etapsky/sdf*