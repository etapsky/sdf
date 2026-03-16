# SDF — Smart Document Format · Spec

> Version: v0.1 · Status: Draft · March 2026 · Etapsky Inc.

This directory contains the normative specification for the SDF (Smart Document
Format) file format, along with JSON Schema definitions and reference examples.

SDF is an open, language-agnostic format that combines a human-readable PDF
layer with a machine-readable JSON layer in a single file. It is applicable to
any structured document exchange — B2B, B2G, and G2G workflows are all
supported.

---

## Contents

| Path | Description |
|---|---|
| [`SDF_FORMAT.md`](./SDF_FORMAT.md) | Normative format specification — the authoritative source of truth |
| [`CHANGELOG.md`](./CHANGELOG.md) | Version history and change log |
| [`schemas/`](./schemas/) | JSON Schema definitions for `meta.json` and `data.json` |
| [`examples/`](./examples/) | Reference examples across different document types and sectors |

---

## Quick start

An SDF file is a ZIP archive with the `.sdf` extension containing four files:

```
example.sdf
├── visual.pdf    ← human-readable layer
├── data.json     ← machine-readable layer
├── schema.json   ← validation rules
└── meta.json     ← identity and provenance
```

Any ZIP tool can open an `.sdf` file. `visual.pdf` is a standard PDF — any PDF
viewer renders it without modification. Systems that understand SDF can
additionally extract structured data directly from `data.json`, eliminating OCR
and manual re-keying.

---

## Status

| Version | Status | Date |
|---|---|---|
| v0.1 | Draft | 2026-03 |

Version `0.x` is pre-stable. Breaking changes may occur between minor versions.
Version `1.0` will be the first stable, production-ready release.

---

## Spec location

This spec lives inside the `etapsky/sdf` monorepo under `spec/`.
Open a pull request against `main` to propose changes.
All breaking changes require a version bump and a `CHANGELOG.md` entry.

---

## Contributing

- Normative language follows RFC 2119: MUST, SHOULD, MAY.
- Breaking changes require a MAJOR version increment.
- Backward-compatible additions require a MINOR version increment.
- All changes must be recorded in `CHANGELOG.md`.

---

*SDF Format Specification · Etapsky Inc. · github.com/etapsky/sdf*