# SDF POC — Proof of Concept

> F1 deliverable · Phase 1 · © 2026 Yunus YILDIZ

This directory contains a minimal, self-contained proof of concept demonstrating
that the SDF format works end-to-end: produce a `.sdf` file from structured
JSON data, then read and validate it.

This is **not** the production implementation. That lives in
`packages/sdf-kit/` (F2). This POC exists to validate the spec before
investing in the full kit.

---

## Structure

```
poc/
├── src/
│   ├── types.ts       ← shared types, error codes, constants
│   ├── container.ts   ← ZIP pack/unpack abstraction (container-decision)
│   ├── validator.ts   ← JSON Schema validation via ajv
│   ├── pdf.ts         ← minimal PDF generator via pdf-lib
│   ├── producer.ts    ← buildSDF() — assembles a .sdf file
│   └── reader.ts      ← parseSDF() — reads and validates a .sdf file
├── bin/
│   ├── build.ts       ← CLI: produce a .sdf from an example
│   └── read.ts        ← CLI: inspect and validate a .sdf file
├── output/            ← generated .sdf files land here (git-ignored)
├── tsconfig.json
└── package.json
```

---

## Setup

```bash
cd spec/poc
npm install
```

Dependencies: `jszip`, `pdf-lib`, `ajv`, `ajv-formats`, `typescript`, `tsx`

---

## Usage

### Produce a .sdf file

```bash
tsx bin/build.ts invoice
tsx bin/build.ts nomination
tsx bin/build.ts gov-tax-declaration
tsx bin/build.ts gov-health-report
```

Reads from `spec/examples/<name>/` and writes to `poc/output/<name>.sdf`.

### Read and validate a .sdf file

```bash
tsx bin/read.ts invoice
tsx bin/read.ts gov-tax-declaration
```

Parses the `.sdf`, validates all layers, and prints a structured inspection
report.

### Inspect manually

Any `.sdf` file is a ZIP archive. You can inspect it with standard tools:

```bash
# List contents
unzip -l output/invoice.sdf

# Extract and inspect
unzip output/invoice.sdf -d /tmp/invoice-sdf/
cat /tmp/invoice-sdf/meta.json
cat /tmp/invoice-sdf/data.json
open /tmp/invoice-sdf/visual.pdf
```

---

## What this proves

| Claim | Proof |
|---|---|
| SDF file is a valid ZIP | `unzip -l` works without errors |
| visual.pdf is a valid PDF | opens in any PDF viewer |
| data.json validates against schema.json | ajv reports no errors |
| meta.json conforms to the meta schema | validator passes |
| PDF-only consumer works | extract visual.pdf, open it — no SDF tooling needed |
| Round-trip works | build → read → same data |

---

## Notes

- The PDF generator is POC-quality — single page, no template support, no
  multi-page handling. F2 replaces this with `pdf-lib` + `pdfkit` templates.
- `container.ts` wraps JSZip behind `packContainer` / `unpackContainer`.
  If the container format decision changes, only this file changes.
  All callers are marked with `// TODO: container-decision`.
- `output/` is git-ignored. Commit the source files, not the generated `.sdf`.

---

*SDF POC · F1 · © 2026 Yunus YILDIZ · github.com/etapsky/sdf*