# sdf-python

> SDF (Smart Document Format) Python reference implementation — producer, reader, validator, signer.

[![License: BUSL-1.1](https://img.shields.io/badge/License-BUSL--1.1-blue.svg)](../../LICENSE)

SDF is an open file format that combines a human-readable PDF layer with a machine-readable JSON layer in a single file. `sdf-python` is the Python reference implementation of the [SDF specification](https://github.com/etapsky/sdf/blob/main/spec/SDF_FORMAT.md).

---

## Installation

```bash
pip install sdf-python
```

Or from source (monorepo):

```bash
cd packages/sdf-python
pip install -e ".[dev]"
```

**Requirements:** Python 3.11+, `jsonschema`, `reportlab`, `cryptography`

---

## Quick start

### Produce a `.sdf` file

```python
from sdf import build_sdf

schema = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["document_type", "invoice_number"],
    "properties": {
        "document_type": {"type": "string"},
        "invoice_number": {"type": "string"},
        "total": {
            "type": "object",
            "properties": {
                "amount": {"type": "string"},
                "currency": {"type": "string"},
            },
        },
    },
}

data = {
    "document_type": "invoice",
    "invoice_number": "INV-2026-001",
    "total": {"amount": "1250.00", "currency": "EUR"},
}

buffer = build_sdf(
    data,
    schema,
    issuer="Acme Supplies GmbH",
    issuer_id="DE123456789",
    document_type="invoice",
    recipient="Global Logistics AG",
)

with open("invoice.sdf", "wb") as f:
    f.write(buffer)
```

### Read and validate a `.sdf` file

```python
from sdf import parse_sdf

with open("invoice.sdf", "rb") as f:
    buffer = f.read()

result = parse_sdf(buffer)

print(result.meta.document_id)    # UUID v4
print(result.meta.sdf_version)   # '0.1'
print(result.data["invoice_number"])  # 'INV-2026-001'
# result.pdf_bytes — serve to a PDF viewer for human review
```

### Validate schema directly

```python
from sdf import validate_schema, validate_schema_or_throw

result = validate_schema(data, schema)
if not result.valid:
    print(result.errors)
else:
    print("Valid")

# Or raise on invalid:
validate_schema_or_throw(data, schema)
```

### Sign and verify

```python
from sdf import (
    generate_key_pair,
    export_public_key,
    export_private_key,
    import_public_key,
    import_private_key,
    sign_sdf,
    verify_sig,
)

# Generate ECDSA P-256 key pair
priv, pub = generate_key_pair("ECDSA")

# Export / import (Base64 SPKI / PKCS#8)
pub_b64 = export_public_key(pub)
priv_b64 = export_private_key(priv)
pub = import_public_key(pub_b64)
priv = import_private_key(priv_b64)

# Sign
signed = sign_sdf(buffer, priv, include_pdf=True)

# Verify
ok = verify_sig(signed, pub)
assert ok
```

---

## API

### Producer — `sdf.build_sdf`

`build_sdf(data, schema, issuer, *, issuer_id=None, document_type=None, recipient=None, recipient_id=None, schema_id=None, tags=None) -> bytes`

Produces a `.sdf` file buffer. Validates `data` against `schema` before producing — raises `SDFValidationError` on failure.

### Reader — `sdf.parse_sdf`

`parse_sdf(buffer: bytes | bytearray) -> SDFParseResult`

Reads and validates a `.sdf` buffer. Returns `SDFParseResult(meta, data, schema, pdf_bytes)`.

### Validator — `sdf.validate_*`

- `validate_meta(meta) -> SDFMeta` — Validates meta.json against normative schema
- `validate_schema(data, schema) -> SDFValidationResult` — Returns `{valid, errors}`
- `validate_schema_or_throw(data, schema)` — Raises `SDFValidationError` on failure

### Signer — `sdf.signer`

- `generate_key_pair(algorithm="ECDSA")` — ECDSA P-256 or RSA 2048
- `export_public_key`, `export_private_key`, `import_public_key`, `import_private_key`
- `sign_sdf(buffer, private_key, *, include_pdf=True, algorithm="ECDSA") -> bytes`
- `verify_sig(buffer, public_key, *, include_pdf=None) -> bool`

---

## Error handling

All errors extend `SDFError` with a `code` field:

```python
from sdf import parse_sdf, SDFError, SDF_ERRORS

try:
    result = parse_sdf(buffer)
except SDFError as e:
    if e.code == SDF_ERRORS["NOT_ZIP"]:
        ...
    elif e.code == SDF_ERRORS["SCHEMA_MISMATCH"]:
        ...
```

---

## Examples

```bash
cd packages/sdf-python
python examples/produce_invoice.py   # creates invoice.sdf
python examples/read_invoice.py [path.sdf]
python examples/sign_and_verify.py
```

---

## Tests

```bash
cd packages/sdf-python
pip install -e ".[dev]"
pytest
```

---

## What is SDF?

A `.sdf` file is a ZIP archive containing:

```
invoice.sdf
├── visual.pdf      ← human-readable layer (any PDF viewer)
├── data.json       ← machine-readable layer
├── schema.json     ← validation rules
├── meta.json       ← identity and provenance
└── signature.sig   ← digital signature (optional)
```

---

## License

BUSL-1.1 — Copyright (c) 2026 Yunus YILDIZ

See [LICENSE](LICENSE) and the [root LICENSE](../../LICENSE) for terms.
