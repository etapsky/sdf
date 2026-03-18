# SDF Format Specification

**Version:** v0.1
**Status:** Draft
**Date:** 2026-03
**Authors:** Yunus YILDIZ
**Repository:** github.com/etapsky/sdf
**License:** Business Source License 1.1 (BUSL-1.1)
**Copyright:** © 2026 Yunus YILDIZ. All rights reserved.
**Change Date:** 2031-03-17 → Apache License 2.0

---

## Table of Contents

1. [Overview](#1-overview)
2. [Motivation](#2-motivation)
3. [Definitions](#3-definitions)
4. [File Structure](#4-file-structure)
   - 4.1 [Container Format](#41-container-format)
   - 4.2 [Internal File Manifest](#42-internal-file-manifest)
   - 4.3 [visual.pdf](#43-visualpdf)
   - 4.4 [data.json](#44-datajson)
   - 4.5 [schema.json](#45-schemajson)
   - 4.6 [meta.json](#46-metajson)
   - 4.7 [signature.sig](#47-signaturesig)
5. [Producer Flow](#5-producer-flow)
6. [Consumer Flow](#6-consumer-flow)
7. [Schema & Validation](#7-schema--validation)
8. [Nomination Matching](#8-nomination-matching)
9. [Backward Compatibility](#9-backward-compatibility)
10. [Versioning](#10-versioning)
11. [Security Considerations](#11-security-considerations)
12. [Error Handling](#12-error-handling)
13. [Reference Implementation](#13-reference-implementation)
14. [Design Decisions & Rationale](#14-design-decisions--rationale)
15. [Comparison with Existing Formats](#15-comparison-with-existing-formats)
16. [Known Limitations](#16-known-limitations)
17. [Future Work](#17-future-work)

---

## 1. Overview

SDF (Smart Document Format) is an open, language-agnostic file format that
combines a human-readable visual layer with a machine-readable structured data
layer inside a single file.

An SDF file is technically a ZIP archive with the `.sdf` extension. It contains
a rendered PDF for human consumption and a set of JSON files carrying the same
information in structured form for machine processing.

```
example.sdf  (ZIP archive)
├── visual.pdf       ← human-readable layer
├── data.json        ← machine-readable layer
├── schema.json      ← validation rules
├── meta.json        ← file metadata and identity
└── signature.sig    ← digital signature (Phase 4)
```

The two layers are independent: a system that does not understand SDF can open
the file with any ZIP tool and read `visual.pdf` as a normal PDF. A system that
does understand SDF can skip the PDF entirely and extract structured data
directly from `data.json`.

SDF is applicable to any structured document exchange scenario — B2B, B2G,
and G2G workflows are all supported. The format carries no assumptions about
the nature of the parties involved, the document type, or the industry vertical.
Any document that today travels as a PDF and is re-keyed on the receiving end
is a candidate for SDF.

---

## 2. Motivation

### 2.1 The Problem

In enterprise document workflows today, visual presentation and structured data
are always stored separately:

- **PDF** is used for human-readable presentation and legal archival.
- **APIs, EDI messages, or databases** carry the same information in structured
  form for system-to-system communication.

This separation creates friction at every boundary crossing:

- When a supplier sends an invoice as PDF, the recipient must run OCR or re-key
  the data manually to feed it into their ERP system.
- OCR introduces error rates, processing cost, and human review overhead.
- When a nomination document is sent as a PDF attachment, matching it against an
  internal record requires manual lookup or probabilistic text matching.
- The PDF and the structured record can fall out of sync — the document says one
  thing, the database says another.

### 2.2 Prior Art and Why It Failed

**XFA (XML Forms Architecture):** Adobe's attempt to embed structured data in
PDFs. Failed due to closed ecosystem (Adobe Reader required), web
incompatibility, and XML verbosity. Deprecated by Adobe in 2021.

**ZUGFeRD / Factur-X:** Embeds XML into PDF/A-3 for electronic invoices.
Successful in the German and French public sector. Narrow scope (invoices only),
XML-based, complex to implement. Not general-purpose.

**PDF/A-3:** ISO standard for long-term archival with embedded attachments.
Provides the container mechanism but no standard for what the attachment contains
or how it is structured. Each implementation is proprietary.

### 2.3 What SDF Does Differently

| Concern | XFA | ZUGFeRD | SDF |
|---|---|---|---|
| Open standard | No | Partial | Yes |
| Data format | XML | XML | JSON |
| Web compatible | No | Partial | Yes |
| General purpose | Yes | No (invoices) | Yes |
| Schema bundled | No | No | Yes |
| Backward compatible | No | No | Yes |
| Language agnostic | No | Partial | Yes |

SDF's key differentiators:
- **JSON over XML** — simpler to parse, native to the web, lower implementation cost.
- **Schema travels with the document** — the receiver does not need out-of-band
  schema knowledge to validate the data.
- **General purpose** — any document type: invoices, nominations, contracts,
  purchase orders, HR forms.
- **Backward compatible by design** — any existing PDF viewer opens an SDF file
  without modification.

---

## 3. Definitions

| Term | Definition |
|---|---|
| **SDF file** | A ZIP archive with the `.sdf` extension conforming to this specification. |
| **Producer** | Any system or application that creates an SDF file. |
| **Consumer** | Any system or application that reads or processes an SDF file. |
| **Visual layer** | The `visual.pdf` file inside the SDF archive. Human-readable. |
| **Data layer** | The `data.json` file inside the SDF archive. Machine-readable. |
| **Schema** | The `schema.json` file inside the SDF archive. Describes and validates `data.json`. |
| **Meta** | The `meta.json` file inside the SDF archive. Contains identity and provenance. |
| **Document type** | A string identifier describing the class of document (e.g. `invoice`, `nomination`). |
| **Issuer** | The entity that produced the SDF file. |
| **sdf_version** | The version of this specification the file was produced against. |
| **MUST / MUST NOT** | Absolute requirements of this specification. Non-conforming files are invalid. |
| **SHOULD / SHOULD NOT** | Strong recommendations. Deviation requires documented justification. |
| **MAY** | Optional behavior. Conforming implementations may or may not implement it. |

---

## 4. File Structure

### 4.1 Container Format

An SDF file MUST be a valid ZIP archive as defined by
[PKWARE Application Note](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)
version 6.3.10 or later.

- The file extension MUST be `.sdf`.
- The ZIP archive MUST NOT be encrypted at the container level.
  (File-level encryption for `data.json` is defined in Section 11.)
- The ZIP archive MUST NOT use ZIP64 extensions unless the total uncompressed
  size of all entries exceeds 4 GB.
- Compression method MAY be Deflate (method 8) or Store (method 0).
  Deflate is RECOMMENDED for `visual.pdf` entries larger than 100 KB.
- The archive MUST NOT contain directories other than those defined in
  Section 4.2.
- File paths inside the archive MUST use forward slashes (`/`) as path
  separators.
- File names MUST be UTF-8 encoded.

**MIME type:** `application/vnd.sdf`
**File extension:** `.sdf`

### 4.2 Internal File Manifest

| Path | Required | Phase | Description |
|---|---|---|---|
| `visual.pdf` | MUST | F1 | Human-readable PDF layer |
| `data.json` | MUST | F1 | Structured document data |
| `schema.json` | MUST | F1 | JSON Schema for `data.json` |
| `meta.json` | MUST | F1 | File identity and provenance |
| `signature.sig` | MAY | F4 | Digital signature over the archive |

No files other than those listed above MAY appear at the root of the archive.
Additional files MAY be placed under a `vendor/` prefix for proprietary
extensions, provided they do not conflict with reserved paths.

### 4.3 visual.pdf

`visual.pdf` MUST be a valid PDF conforming to PDF 1.4 or later, or PDF/A-1b
or later for archival use cases.

- The visual layer MUST contain a complete, human-readable representation of
  the document. A reader that ignores all other files in the archive MUST be
  able to understand the document from `visual.pdf` alone.
- The visual layer SHOULD accurately reflect all fields present in `data.json`.
  If a discrepancy exists between `visual.pdf` and `data.json`, `data.json` is
  authoritative for machine processing.
- The visual layer MAY include form fields (AcroForms), but MUST NOT require
  Adobe Reader or any proprietary PDF viewer to be fully rendered.
- `visual.pdf` MUST NOT reference external resources (fonts, images, color
  profiles) by URL. All resources MUST be embedded.

**Recommended PDF generation libraries:**

| Environment | Library |
|---|---|
| Node.js / Browser | `pdf-lib` |
| Node.js (complex layouts) | `pdfkit` |
| Server-side HTML → PDF | `WeasyPrint`, `Puppeteer` |
| Python | `reportlab`, `weasyprint` |

### 4.4 data.json

`data.json` is the machine-readable data layer. It MUST be a valid JSON document
(RFC 8259).

- The root value MUST be a JSON object.
- All string values MUST be UTF-8 encoded.
- Numeric values MUST be represented as JSON numbers. Monetary amounts MUST be
  represented as strings with explicit currency codes (see Section 4.4.2) to
  avoid floating-point precision loss.
- `data.json` MUST be valid against the `schema.json` bundled in the same
  archive.

#### 4.4.1 Reserved Top-Level Keys

The following top-level keys are reserved by this specification and MUST NOT be
used for application data:

| Key | Description |
|---|---|
| `_sdf` | Reserved for future spec use |
| `_meta` | Reserved for future spec use |
| `_signature` | Reserved for future spec use |

#### 4.4.2 Monetary Amounts

Monetary amounts MUST be represented as objects with `amount` (string) and
`currency` (ISO 4217 code) keys:

```json
{
  "total": {
    "amount": "1250.00",
    "currency": "EUR"
  }
}
```

Amounts MUST NOT be represented as bare JSON numbers. This avoids
floating-point representation errors and removes ambiguity about currency.

#### 4.4.3 Dates and Timestamps

- Dates MUST be represented as strings in `YYYY-MM-DD` format (ISO 8601).
- Timestamps MUST be represented as strings in RFC 3339 format with timezone
  offset (e.g. `2026-03-15T14:30:00+01:00`).
- Use of UTC (offset `+00:00` or `Z`) is RECOMMENDED.

#### 4.4.4 Identifiers

- Identifiers that must be globally unique MUST be UUIDs (RFC 4122 v4).
- Identifiers that are scoped to an issuer MAY be any non-empty string.

#### 4.4.5 Example

```json
{
  "document_type": "invoice",
  "invoice_number": "INV-2026-00142",
  "issue_date": "2026-03-15",
  "due_date": "2026-04-15",
  "issuer": {
    "name": "Acme Supplies GmbH",
    "vat_id": "DE123456789",
    "address": {
      "street": "Hauptstraße 12",
      "city": "Berlin",
      "postal_code": "10115",
      "country": "DE"
    }
  },
  "recipient": {
    "name": "Global Logistics AG",
    "vat_id": "CH-123.456.789",
    "address": {
      "street": "Bahnhofstrasse 4",
      "city": "Zürich",
      "postal_code": "8001",
      "country": "CH"
    }
  },
  "line_items": [
    {
      "description": "Industrial valve Type-A",
      "quantity": 50,
      "unit": "pcs",
      "unit_price": { "amount": "24.00", "currency": "EUR" },
      "vat_rate": "0.19",
      "subtotal":  { "amount": "1200.00", "currency": "EUR" }
    }
  ],
  "totals": {
    "net":   { "amount": "1200.00", "currency": "EUR" },
    "vat":   { "amount": "228.00",  "currency": "EUR" },
    "gross": { "amount": "1428.00", "currency": "EUR" }
  },
  "payment": {
    "iban": "DE89370400440532013000",
    "reference": "INV-2026-00142"
  }
}
```

### 4.5 schema.json

`schema.json` MUST be a valid JSON Schema document conforming to
[JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/schema).

- `schema.json` MUST validate `data.json` without errors when processed by a
  conforming JSON Schema validator.
- `schema.json` MUST include a `$schema` keyword pointing to the JSON Schema
  2020-12 meta-schema URI.
- `schema.json` SHOULD include a `$id` URI that uniquely identifies the schema
  version.
- `schema.json` SHOULD use `"additionalProperties": false` at the root to
  prevent undocumented fields.
- `schema.json` MUST NOT reference external URIs (no `$ref` to remote schemas).
  All schema components MUST be self-contained within the file.

#### 4.5.1 Example

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://etapsky.github.io/sdf/schemas/invoice/v0.1.json",
  "title": "SDF Invoice",
  "description": "Schema for SDF invoice documents, v0.1",
  "type": "object",
  "required": ["document_type", "invoice_number", "issue_date", "issuer", "recipient", "line_items", "totals"],
  "properties": {
    "document_type": { "type": "string", "const": "invoice" },
    "invoice_number": { "type": "string", "minLength": 1 },
    "issue_date":     { "type": "string", "format": "date" },
    "due_date":       { "type": "string", "format": "date" },
    "issuer":         { "$ref": "#/$defs/party" },
    "recipient":      { "$ref": "#/$defs/party" },
    "line_items": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/line_item" }
    },
    "totals": { "$ref": "#/$defs/totals" },
    "payment": { "$ref": "#/$defs/payment" }
  },
  "additionalProperties": false,
  "$defs": {
    "monetary_amount": {
      "type": "object",
      "required": ["amount", "currency"],
      "properties": {
        "amount":   { "type": "string", "pattern": "^\\d+(\\.\\d{1,4})?$" },
        "currency": { "type": "string", "pattern": "^[A-Z]{3}$" }
      },
      "additionalProperties": false
    },
    "address": {
      "type": "object",
      "required": ["street", "city", "country"],
      "properties": {
        "street":      { "type": "string" },
        "city":        { "type": "string" },
        "postal_code": { "type": "string" },
        "country":     { "type": "string", "pattern": "^[A-Z]{2}$" }
      },
      "additionalProperties": false
    },
    "party": {
      "type": "object",
      "required": ["name"],
      "properties": {
        "name":    { "type": "string" },
        "vat_id":  { "type": "string" },
        "address": { "$ref": "#/$defs/address" }
      },
      "additionalProperties": false
    },
    "line_item": {
      "type": "object",
      "required": ["description", "quantity", "unit_price", "subtotal"],
      "properties": {
        "description": { "type": "string" },
        "quantity":    { "type": "number", "minimum": 0 },
        "unit":        { "type": "string" },
        "unit_price":  { "$ref": "#/$defs/monetary_amount" },
        "vat_rate":    { "type": "string", "pattern": "^0(\\.\\d+)?$" },
        "subtotal":    { "$ref": "#/$defs/monetary_amount" }
      },
      "additionalProperties": false
    },
    "totals": {
      "type": "object",
      "required": ["gross"],
      "properties": {
        "net":   { "$ref": "#/$defs/monetary_amount" },
        "vat":   { "$ref": "#/$defs/monetary_amount" },
        "gross": { "$ref": "#/$defs/monetary_amount" }
      },
      "additionalProperties": false
    },
    "payment": {
      "type": "object",
      "properties": {
        "iban":      { "type": "string" },
        "bic":       { "type": "string" },
        "reference": { "type": "string" }
      },
      "additionalProperties": false
    }
  }
}
```

### 4.6 meta.json

`meta.json` carries identity and provenance metadata for the SDF file itself,
distinct from the business data in `data.json`.

- `meta.json` MUST be a valid JSON document.
- `meta.json` MUST conform to the SDF Meta Schema published at
  `https://etapsky.github.io/sdf/schemas/meta.schema.json`.

#### 4.6.1 Required Fields

| Field | Type | Description |
|---|---|---|
| `sdf_version` | `string` | SDF spec version this file was produced against. Format: `MAJOR.MINOR` (e.g. `"0.1"`). |
| `document_id` | `string` | UUID v4. Globally unique identifier for this document instance. MUST NOT change across re-exports of the same document. |
| `issuer` | `string` | Name or unique identifier of the producing entity. |
| `created_at` | `string` | RFC 3339 timestamp of when this SDF file was produced. |

#### 4.6.2 Optional Fields

| Field | Type | Description |
|---|---|---|
| `document_type` | `string` | Class of document. RECOMMENDED. E.g. `"invoice"`, `"nomination"`, `"purchase_order"`. |
| `document_version` | `string` | Version of this document if it has been amended. Semver string (e.g. `"1.0.0"`). |
| `issuer_id` | `string` | Machine-readable identifier for the issuer (e.g. GLN, VAT ID, UUID). |
| `recipient` | `string` | Name or identifier of the intended recipient. |
| `recipient_id` | `string` | Machine-readable identifier for the recipient. |
| `schema_id` | `string` | URI of the `schema.json` `$id`. Allows external validation without unpacking the archive. |
| `signature_algorithm` | `string` | Algorithm used for `signature.sig`. Reserved for Phase 4. |
| `parent_document_id` | `string` | UUID of the document this file amends or supersedes. |
| `expires_at` | `string` | RFC 3339 timestamp after which the document should be considered stale. |
| `tags` | `array` of `string` | Free-form tags for routing or categorisation. |

#### 4.6.3 Example

```json
{
  "sdf_version": "0.1",
  "document_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "issuer": "Acme Supplies GmbH",
  "issuer_id": "DE123456789",
  "created_at": "2026-03-15T14:30:00+01:00",
  "document_type": "invoice",
  "document_version": "1.0.0",
  "recipient": "Global Logistics AG",
  "recipient_id": "CH-123.456.789",
  "schema_id": "https://etapsky.github.io/sdf/schemas/invoice/v0.1.json",
  "tags": ["q1-2026", "key-account"]
}
```

### 4.7 signature.sig

`signature.sig` is reserved for Phase 4 of the SDF roadmap. It MUST NOT be
present in Phase 1–3 implementations.

When present, `signature.sig` MUST contain a detached digital signature over
the canonical content of the archive, as defined in the Phase 4 security
specification (to be published separately).

- Supported algorithms: RSA-2048 with SHA-256, ECDSA P-256 with SHA-256.
- The signing procedure, key distribution mechanism, and verification flow are
  out of scope for v0.1.

**Field reservation:** Producers SHOULD include `"signature_algorithm": null`
in `meta.json` as a forward-compatibility marker. Consumers MUST ignore this
field if `signature.sig` is absent.

---

## 5. Producer Flow

A producer is any system that generates an SDF file. The canonical producer
flow is as follows:

### Step 1 — Collect form data

Receive structured input from the user interface, ERP system, or programmatic
API call. The input MUST conform to the document type's schema before proceeding.

### Step 2 — Validate against schema

Validate the input data against the `schema.json` for the target document type.
Any validation error MUST halt the producer flow and be returned to the caller.
Partial or invalid SDF files MUST NOT be written to disk or transmitted.

### Step 3 — Generate visual.pdf

Render the validated data into a PDF using the producer's configured PDF engine.
The producer MUST ensure that all fields present in `data.json` are visually
represented in `visual.pdf`. Producers MAY include additional visual content
(logos, watermarks, terms) that is not represented in `data.json`.

### Step 4 — Assemble JSON files

Produce the three JSON files:

- `data.json` — the validated input data as a JSON object.
- `schema.json` — a copy of the schema used for validation. MUST be the same
  version used in Step 2.
- `meta.json` — generate a fresh UUID v4 for `document_id`, set `created_at` to
  the current UTC timestamp, populate all required fields.

### Step 5 — Pack ZIP archive

Create a ZIP archive containing:
```
visual.pdf
data.json
schema.json
meta.json
```
Write the archive with `.sdf` extension.

### Step 6 — Sign (Phase 4 only)

If digital signing is enabled, produce `signature.sig` as defined in the Phase 4
specification and add it to the archive. Update `meta.json` with
`signature_algorithm`.

### Step 7 — Deliver

Transmit the `.sdf` file via the appropriate channel (email attachment, API
upload, file system write, webhook payload).

### Producer pseudocode

```typescript
async function buildSDF(input: unknown, options: ProducerOptions): Promise<Buffer> {
  // Step 2
  const schema = await loadSchema(options.documentType);
  const validation = validateSchema(input, schema);
  if (!validation.valid) throw new SDFValidationError(validation.errors);

  // Step 3
  const pdfBytes = await generatePDF(input, options.pdfTemplate);

  // Step 4
  const meta: SDFMeta = {
    sdf_version: SDF_VERSION,
    document_id: crypto.randomUUID(),
    issuer: options.issuer,
    created_at: new Date().toISOString(),
    document_type: options.documentType,
    schema_id: schema.$id,
  };

  // Step 5
  const zip = new JSZip();
  zip.file('visual.pdf', pdfBytes);
  zip.file('data.json', JSON.stringify(input, null, 2));
  zip.file('schema.json', JSON.stringify(schema, null, 2));
  zip.file('meta.json', JSON.stringify(meta, null, 2));

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
```

---

## 6. Consumer Flow

A consumer is any system that reads or processes an SDF file.

### Step 1 — Open ZIP archive

Open the file as a ZIP archive. If the file is not a valid ZIP, MUST return
`SDF_ERROR_NOT_ZIP`.

### Step 2 — Read meta.json

Extract and parse `meta.json`. If `meta.json` is absent or invalid JSON, MUST
return `SDF_ERROR_INVALID_META`.

Check `sdf_version`. If the version is higher than the consumer's supported
maximum version, SHOULD emit a warning but MAY continue processing if the
required files are present.

### Step 3 — Validate data.json

Extract `schema.json` and `data.json`. Validate `data.json` against `schema.json`.
If validation fails, MUST return `SDF_ERROR_SCHEMA_MISMATCH` with the full list
of validation errors.

### Step 4 — Route data

Pass the validated JSON object from `data.json` to the consuming application
(ERP system, matching engine, database write, API call). The consumer MUST NOT
modify `data.json` in transit.

### Step 5 — Present visual (if needed)

If human review is required, serve `visual.pdf` through the appropriate viewer.

### Step 6 — Verify signature (Phase 4 only)

If `signature.sig` is present, verify it against the archive contents as
defined in the Phase 4 specification. If verification fails, MUST return
`SDF_ERROR_INVALID_SIGNATURE`.

### Consumer pseudocode

```typescript
async function parseSDF(buffer: Buffer): Promise<SDFParseResult> {
  // Step 1
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(buffer); }
  catch { throw new SDFError('SDF_ERROR_NOT_ZIP'); }

  // Step 2
  const metaRaw = await zip.file('meta.json')?.async('string');
  if (!metaRaw) throw new SDFError('SDF_ERROR_INVALID_META');
  const meta: SDFMeta = JSON.parse(metaRaw);
  validateMeta(meta); // throws SDFError on failure

  // Step 3
  const schemaRaw = await zip.file('schema.json')?.async('string');
  const dataRaw   = await zip.file('data.json')?.async('string');
  if (!schemaRaw || !dataRaw) throw new SDFError('SDF_ERROR_MISSING_FILE');
  const schema = JSON.parse(schemaRaw);
  const data   = JSON.parse(dataRaw);
  const result = validateSchema(data, schema);
  if (!result.valid) throw new SDFSchemaError('SDF_ERROR_SCHEMA_MISMATCH', result.errors);

  // Step 5
  const pdfBytes = await zip.file('visual.pdf')?.async('nodebuffer');

  return { meta, data, schema, pdfBytes };
}
```

---

## 7. Schema & Validation

### 7.1 Schema Transport

The `schema.json` bundled inside an SDF file is the authoritative schema for
that specific file. Consumers MUST validate `data.json` against the bundled
`schema.json`, not against any externally retrieved schema.

Rationale: Documents are often processed long after creation. External schema
URIs may become unavailable. The schema must travel with the document.

### 7.2 Schema Versioning

Schemas are versioned independently of the SDF spec version. The `$id` field
in `schema.json` MUST include a version path segment:

```
https://etapsky.github.io/sdf/schemas/{document_type}/v{MAJOR}.{MINOR}.json
```

**Backward compatibility rule for schemas:**

- **Patch changes** (adding optional fields, relaxing constraints): non-breaking.
  Documents produced with an older schema version MUST be valid against a newer
  patch version.
- **Minor version changes** (adding required fields, new `$defs`): potentially
  breaking for producers; non-breaking for consumers that use `parseSDF`.
- **Major version changes**: breaking. A v2.x schema is not expected to validate
  documents produced with v1.x.

### 7.3 Validation Libraries

| Runtime | Recommended library |
|---|---|
| Node.js / Browser | `ajv` (Ajv v8, JSON Schema 2020-12) |
| Python | `jsonschema` (v4.x) |
| Go | `github.com/santhosh-tekuri/jsonschema/v5` |
| Rust | `jsonschema` crate |
| Java | `networknt/json-schema-validator` |

### 7.4 Validation Levels

Consumers MAY implement two validation levels:

| Level | Description | Requirement |
|---|---|---|
| **Strict** | Full JSON Schema validation including `format` keywords | RECOMMENDED for server-side ERP ingestion |
| **Lenient** | Structural validation only (required fields present, correct types) | MAY be used for display-only consumers |

Producers MUST always validate at strict level before writing the archive.

---

## 8. Nomination Matching

One of SDF's primary use cases is automating nomination matching: correlating
a supplier-issued document against an internal record in the recipient's system.

### 8.1 The Nomination Reference Field

Producers of documents that are associated with a nomination SHOULD include
a `nomination_ref` field in `data.json`:

```json
{
  "nomination_ref": "NOM-2026-0042",
  ...
}
```

The value MUST be an identifier that the recipient's system can look up without
ambiguity. The producer and consumer MUST agree on the identifier namespace
out-of-band (e.g. as part of a trading partner agreement).

### 8.2 Matching Flow

When a consumer's ERP system receives an SDF file containing `nomination_ref`:

1. Extract `nomination_ref` from `data.json`.
2. Query internal nomination records for a match.
3. If found: proceed with automated ingestion. No human review required.
4. If not found: route to exception queue for manual handling.

This flow eliminates OCR, probabilistic text matching, and manual data entry for
the matched portion of the workflow.

### 8.3 Extended Matching Fields

Additional fields MAY be used to support matching when `nomination_ref` alone is
insufficient:

| Field | Description |
|---|---|
| `order_ref` | Reference to the order/sale (e.g. PO number, sales order) — used by invoice for PO–invoice matching |
| `contract_ref` | Contract identifier |
| `delivery_note_ref` | Delivery note number |
| `period` | Reporting period (ISO 8601 date range) |

These are conventions, not requirements. Include them in `schema.json` if used.

---

## 9. Backward Compatibility

### 9.1 PDF-Only Consumers

Any system that does not understand the SDF format MAY open an SDF file using
a ZIP tool and extract `visual.pdf`. The extracted PDF is a valid, complete PDF
document requiring no SDF-specific processing.

This property is guaranteed by the container format: ZIP is universally
supported, and the PDF file is stored at a predictable path.

### 9.2 SDF-Aware Consumer Receiving Non-SDF File

If a consumer receives a file with a `.sdf` extension that is not a valid ZIP
archive, the consumer MUST return `SDF_ERROR_NOT_ZIP`. The consumer MUST NOT
attempt to process the file as a PDF directly.

### 9.3 Version Forward Compatibility

A consumer implementing SDF v0.x MUST NOT reject a file with `sdf_version`
set to `"0.y"` where `y > x`. The consumer SHOULD process the file and SHOULD
emit a warning that the file was produced against a newer minor version.

A consumer implementing SDF v0.x MUST reject a file with `sdf_version` set to
`"1.0"` or higher with error `SDF_ERROR_UNSUPPORTED_VERSION`.

### 9.4 Unknown Fields in meta.json

Consumers MUST ignore unknown fields in `meta.json`. This allows producers on a
newer spec version to include new optional meta fields without breaking existing
consumers.

---

## 10. Versioning

### 10.1 SDF Spec Version

The SDF specification uses a two-part version number: `MAJOR.MINOR`.

| Increment | Trigger |
|---|---|
| **MAJOR** | Format-breaking change. Old consumers cannot reliably read new files. |
| **MINOR** | Backward-compatible addition. Old consumers can still read new files. |

Changes that require a MAJOR increment:
- Changing the container format (e.g. from ZIP to another format).
- Removing or renaming a required file from the manifest.
- Changing the required structure of `meta.json` in a breaking way.

Changes that increment only MINOR:
- Adding new optional files to the manifest.
- Adding new optional fields to `meta.json`.
- Clarifying normative language without changing behavior.

### 10.2 Current Version

The current version of this specification is `0.1`. Files produced against this
version MUST set `"sdf_version": "0.1"` in `meta.json`.

Version `0.x` (zero major) indicates the specification is in pre-stable draft.
Breaking changes MAY occur between minor versions during `0.x`.

Version `1.0` will indicate the first stable, production-ready release of the
specification.

### 10.3 Changelog

All changes to this specification are recorded in
[CHANGELOG.md](./CHANGELOG.md) using the
[Keep a Changelog](https://keepachangelog.com) format.

---

## 11. Security Considerations

### 11.1 Phase 1–3: No Cryptographic Guarantees

In Phase 1–3, SDF provides no cryptographic integrity or authenticity
guarantees. Any party with write access to the ZIP archive can modify
`data.json` without detection. Consumers MUST NOT rely on an SDF file's
contents for high-stakes decisions (payments, legal obligations) without
out-of-band trust establishment.

### 11.2 Phase 4: Digital Signatures

Phase 4 introduces `signature.sig` containing a detached digital signature.
The full signing and verification specification will be published as a separate
addendum to this document. The following decisions are made now to reserve
compatibility:

- **Algorithms:** RSA-2048 with SHA-256 PKCS#1 v1.5, or ECDSA P-256 with
  SHA-256. Both MUST be supported by conforming Phase 4 implementations.
- **Signed content:** The signature MUST cover the canonical content of
  `data.json`, `schema.json`, and `meta.json`. `visual.pdf` MAY be included
  in the signed content at the producer's discretion.
- **Key distribution:** Out of scope for v0.1. Possible approaches: X.509
  certificates embedded in `meta.json`, well-known URI discovery, or
  trading-partner key exchange.

### 11.3 Content Security

- Producers MUST NOT embed executable content (JavaScript, macros) in
  `visual.pdf`.
- Consumers MUST NOT execute any content found in `visual.pdf`.
- `data.json` and `schema.json` are data-only. Consumers MUST parse them as
  JSON and MUST NOT evaluate them as code.

### 11.4 Path Traversal

Consumers MUST verify that all file paths inside the ZIP archive are contained
within the archive root and do not contain `..` components. Files with
traversal paths MUST be rejected with `SDF_ERROR_INVALID_ARCHIVE`.

### 11.5 ZIP Bomb Protection

Consumers MUST enforce a maximum uncompressed size limit before extracting
archive contents. The RECOMMENDED default limit is 50 MB per file and 200 MB
total. Files exceeding these limits MUST be rejected with
`SDF_ERROR_ARCHIVE_TOO_LARGE`.

### 11.6 Sensitive Data

Producers generating SDF files that contain personally identifiable
information (PII) or commercially sensitive data SHOULD transmit them over
encrypted channels (TLS 1.2 or later) and SHOULD store them with appropriate
access controls. SDF provides no encryption at rest — this is the
responsibility of the transport and storage layers.

---

## 12. Error Handling

### 12.1 Error Codes

All conforming implementations MUST use the following error codes when
returning errors from SDF operations:

| Code | Trigger |
|---|---|
| `SDF_ERROR_NOT_ZIP` | The file is not a valid ZIP archive. |
| `SDF_ERROR_INVALID_META` | `meta.json` is absent, not valid JSON, or missing required fields. |
| `SDF_ERROR_MISSING_FILE` | One or more required files (`visual.pdf`, `data.json`, `schema.json`) are absent. |
| `SDF_ERROR_SCHEMA_MISMATCH` | `data.json` fails validation against `schema.json`. |
| `SDF_ERROR_INVALID_SCHEMA` | `schema.json` is not a valid JSON Schema document. |
| `SDF_ERROR_UNSUPPORTED_VERSION` | `sdf_version` is higher than the consumer's supported maximum. |
| `SDF_ERROR_INVALID_SIGNATURE` | `signature.sig` is present but verification fails. (Phase 4) |
| `SDF_ERROR_INVALID_ARCHIVE` | Archive contains path traversal or other structural violations. |
| `SDF_ERROR_ARCHIVE_TOO_LARGE` | Archive contents exceed the configured size limit. |

### 12.2 Error Object Shape

Implementations SHOULD return errors as structured objects rather than plain
strings. Recommended shape:

```typescript
interface SDFError {
  code: string;          // one of the error codes above
  message: string;       // human-readable description
  details?: unknown;     // optional structured detail (e.g. validation errors array)
  file?: string;         // the internal file that caused the error, if applicable
}
```

### 12.3 Partial Reads

Consumers MAY implement a partial read mode that extracts `meta.json` and
`data.json` without reading `visual.pdf`. This is useful for high-throughput
server-side ingestion where the PDF is never needed. Partial read mode MUST
still validate `data.json` against `schema.json`.

---

## 13. Reference Implementation

The reference implementation of the SDF specification is
`@etapsky/sdf-kit`, published on npm.

### 13.1 Package

```
npm install @etapsky/sdf-kit
```

### 13.2 API Surface

```typescript
// Producer
import { buildSDF } from '@etapsky/sdf-kit/producer';

const sdfBuffer = await buildSDF({
  data: invoiceData,
  schema: invoiceSchema,
  pdfTemplate: 'invoice-a4',
  issuer: 'Acme Supplies GmbH',
  documentType: 'invoice',
});

// Consumer
import { parseSDF } from '@etapsky/sdf-kit/reader';

const { meta, data, schema, pdfBytes } = await parseSDF(fileBuffer);

// Validator
import { validateSDF } from '@etapsky/sdf-kit/validator';

const result = validateSDF(fileBuffer);
// result: { valid: boolean; errors: SDFError[] }
```

### 13.3 Supported Environments

| Environment | Support |
|---|---|
| Node.js 20 LTS | Full |
| Node.js 22 LTS | Full |
| Browser (modern) | Full (Web Crypto API for Phase 4) |
| Electron | Full |
| Deno | Planned (Phase 3) |
| Bun | Planned (Phase 3) |

### 13.4 Test Coverage Requirement

The reference implementation MUST maintain ≥80% line and branch coverage.
Coverage is enforced in CI via Vitest on every pull request to `main`.

---

## 14. Design Decisions & Rationale

### 14.1 Why ZIP?

ZIP is the most widely supported archive format across all operating systems and
programming languages. DOCX, XLSX, PPTX, and JAR all use ZIP as their
container. Libraries exist in every mainstream language. The format is
patent-free and openly specified.

Alternatives considered:

| Alternative | Reason rejected |
|---|---|
| PDF/A-3 embedded attachment | Requires PDF parser to extract data; no standard structure for the attachment. |
| Multipart MIME | Awkward for file-system storage; email-centric; less familiar to system integrators. |
| Custom binary format | Implementation cost; no ecosystem tooling; no backward compatibility path. |
| tar.gz | Poor Windows support; streaming-only extraction model; less familiar. |

### 14.2 Why JSON?

JSON is the lingua franca of modern APIs and web services. Every mainstream
language has a high-quality JSON parser in its standard library. JSON Schema is
a mature, well-tooled standard for describing JSON structures.

XML (as used by ZUGFeRD/XRechnung) requires namespace handling, XPath/XSD
tooling, and is significantly more verbose for the same information. JSON
reduces implementation cost, especially for web and mobile consumers.

### 14.3 Why Bundle the Schema?

Bundling `schema.json` inside the archive ensures that:

1. The document can be validated years after creation without requiring access
   to an external URL.
2. The consumer knows exactly which version of the schema the producer used.
3. No network request is required during processing — important for
   high-throughput or offline scenarios.

The tradeoff is file size overhead (~2–10 KB per file). This is acceptable.

### 14.4 Why Separate meta.json from data.json?

`meta.json` carries SDF-level metadata (identity, provenance, version).
`data.json` carries business data (invoice fields, nomination data).

Mixing them would require every `schema.json` to also describe the SDF metadata
layer, coupling document schemas to the spec version. Separation allows
`meta.json` to evolve independently of `data.json`, and allows consumers to
read identity information without validating business data.

### 14.5 The document_id Decision

`document_id` is a UUID v4 generated at **production time**, not derived from
business identifiers like invoice numbers. This decision was made because:

- Business identifiers are not globally unique (two suppliers can both issue
  invoice INV-001).
- UUIDs eliminate collision risk in multi-tenant storage systems.
- The business identifier (e.g. `invoice_number`) lives in `data.json` and is
  indexed separately.

**This is a format-critical decision.** Changing the uniqueness semantics of
`document_id` after the format is in use would require a major version bump.

---

## 15. Comparison with Existing Formats

### 15.1 Feature Matrix

| Feature | Classic PDF | XFA | ZUGFeRD | PDF/A-3 | **SDF** |
|---|:---:|:---:|:---:|:---:|:---:|
| Open standard | ✗ | ✗ | △ | ✓ | ✓ |
| JSON data layer | ✗ | ✗ | ✗ | ✗ | **✓** |
| Web compatible | ✓ | ✗ | △ | ✓ | ✓ |
| No OCR required | ✗ | ✓ | ✓ | △ | ✓ |
| General purpose | ✓ | ✓ | ✗ | ✓ | ✓ |
| Schema bundled | ✗ | △ | ✗ | ✗ | **✓** |
| Backward compatible | N/A | ✗ | ✗ | N/A | **✓** |
| Language agnostic | ✓ | ✗ | △ | ✓ | ✓ |
| Active ecosystem | ✓ | ✗ | △ | △ | Draft |

*✓ Full · △ Partial · ✗ Not supported*

### 15.2 ZUGFeRD Interoperability

SDF is not a replacement for ZUGFeRD in jurisdictions where ZUGFeRD is
mandated. In those cases, the ZUGFeRD XML may be included as an additional
file under `vendor/zugferd/` within the SDF archive. This is a MAY, not a
requirement, and is not validated by the SDF spec.

---

## 16. Known Limitations

### 16.1 File Size

Including both a rendered PDF and JSON data in a single archive increases file
size compared to sending either format alone. For simple single-page documents
the overhead is typically 20–150 KB. For complex multi-page documents with
embedded images, this may grow to several megabytes.

Mitigation: Use Deflate compression for `visual.pdf`. For use cases where
bandwidth is critical, the PDF MAY be replaced by a URL reference to the visual
layer (planned for a future minor version).

### 16.2 PDF Rendering Consistency

The visual layer must be regenerated each time data changes. Pixel-perfect
consistency of `visual.pdf` across producer implementations is not guaranteed.
Two producers generating a visual layer from the same `data.json` may produce
PDFs that differ in layout, font rendering, or pagination.

### 16.3 Binary Attachments

SDF v0.1 does not define a mechanism for including binary attachments (images,
supporting documents) as structured data. Binary attachments MAY be referenced
by URL in `data.json`. Embedding binary content in the archive is not yet
specified and may be addressed in a future minor version.

### 16.4 Network Effect Dependency

The full value of SDF — elimination of OCR and manual data entry — is only
realised when both the producer and consumer use SDF-aware systems. Single-sided
adoption reduces the benefit to convenience (structured data available
internally) without eliminating the cross-boundary data re-entry problem.

---

## 17. Future Work

The following topics are deferred to future specification versions. They are
listed here to inform implementers of the intended direction and to avoid design
decisions that would conflict with them.

| Topic | Target version |
|---|---|
| Digital signatures and key distribution (Phase 4) | v0.2 |
| Data encryption for sensitive fields | v0.2 |
| SDF Schema Registry — canonical schema publication | v0.2 |
| Binary attachment embedding | v0.3 |
| Multi-language visual layers | v0.3 |
| Streaming / chunked SDF for large documents | v0.4 |
| SDF Diff — structured change tracking between document versions | v0.4 |
| URL reference for visual layer (lightweight mode) | v0.3 |
| Python SDK (`sdf-python`) | Phase 3 |
| VS Code extension for SDF inspection | Phase 4 |

---

## Appendix A: meta.json JSON Schema

The normative schema for `meta.json` is maintained at:

```
https://etapsky.github.io/sdf/schemas/meta.schema.json
```

For reference, the current version is reproduced here:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://etapsky.github.io/sdf/schemas/meta.schema.json",
  "title": "SDF Meta",
  "description": "Schema for meta.json inside an SDF file. Version: 0.1.",
  "type": "object",
  "required": ["sdf_version", "document_id", "issuer", "created_at"],
  "properties": {
    "sdf_version":        { "type": "string", "pattern": "^\\d+\\.\\d+$" },
    "document_id":        { "type": "string", "format": "uuid" },
    "issuer":             { "type": "string", "minLength": 1 },
    "created_at":         { "type": "string", "format": "date-time" },
    "document_type":      { "type": "string" },
    "document_version":   { "type": "string" },
    "issuer_id":          { "type": "string" },
    "recipient":          { "type": "string" },
    "recipient_id":       { "type": "string" },
    "schema_id":          { "type": "string", "format": "uri" },
    "signature_algorithm":{ "type": ["string", "null"] },
    "parent_document_id": { "type": "string", "format": "uuid" },
    "expires_at":         { "type": "string", "format": "date-time" },
    "tags": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "additionalProperties": false
}
```

---

## Appendix B: Minimal Valid SDF File

The smallest possible valid SDF file conforming to v0.1:

**meta.json**
```json
{
  "sdf_version": "0.1",
  "document_id": "00000000-0000-4000-8000-000000000001",
  "issuer": "Example Corp",
  "created_at": "2026-01-01T00:00:00Z"
}
```

**data.json**
```json
{ "hello": "world" }
```

**schema.json**
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "hello": { "type": "string" }
  }
}
```

**visual.pdf** — any valid PDF file.

---

*SDF Format Specification · v0.1 · Draft · March 2026 · © Yunus YILDIZ*
*This document is published under the Business Source License 1.1 (BUSL-1.1). Change Date 2031-03-17 → Apache License 2.0.*
*Contributions and feedback: github.com/etapsky/sdf*