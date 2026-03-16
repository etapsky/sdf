# SDF Examples

This directory contains reference examples demonstrating SDF across different
document types and exchange scenarios.

---

## Important

**SDF is not limited to these document types.**

These examples exist to show that SDF works for any structured document —
invoices, government forms, nominations, purchase orders, permit applications,
health reports, lab results, shipping manifests, HR forms, contracts. The format carries no
assumptions about the industry vertical, the parties involved, or the document
class.

Any document that today travels as a PDF and is re-keyed on the receiving end
is a candidate for SDF.

---

## Examples

| Directory | Document type | Exchange scenario |
|---|---|---|
| [`invoice/`](./invoice/) | Commercial invoice | B2B |
| [`nomination/`](./nomination/) | Cargo nomination | B2B |
| [`purchase-order/`](./purchase-order/) | Purchase order | B2B |
| [`gov-tax-declaration/`](./gov-tax-declaration/) | Tax declaration | B2G |
| [`gov-customs-declaration/`](./gov-customs-declaration/) | Customs declaration | B2G · G2G |
| [`gov-permit-application/`](./gov-permit-application/) | Permit application | B2G · G2G |
| [`gov-health-report/`](./gov-health-report/) | Mandatory health report | B2G · G2G |

---

## What each example contains

Each example directory contains:

```
{example}/
├── data.json      ← structured business data
├── schema.json    ← JSON Schema for this document type
├── meta.json      ← SDF identity and provenance metadata
└── README.md      ← description, field notes, and use case context
```

`visual.pdf` is not included in the spec examples — it is generated at
runtime by the producer. The F1 proof-of-concept script will produce actual
`.sdf` files from these inputs.

---

## Adding new examples

1. Create a new directory under `examples/`.
2. Add `data.json`, `schema.json`, `meta.json`, and `README.md`.
3. The `schema.json` MUST conform to JSON Schema Draft 2020-12.
4. The `data.json` MUST validate against `schema.json`.
5. The `meta.json` MUST conform to `schemas/meta.schema.json`.
6. Add the example to the table in this README.

---

*SDF Format Specification · Etapsky Inc. · github.com/etapsky/sdf*