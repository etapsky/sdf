# Changelog

All notable changes to etapsky-sdf are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.1.0] - 2026-03-19

### Added

- **Producer**: `build_sdf()` — build `.sdf` from data and JSON Schema
- **Reader**: `parse_sdf()` — parse and validate `.sdf` archives
- **Validator**: `validate_meta()`, `validate_schema()`, `validate_schema_or_throw()`
- **Signer**: ECDSA P-256 and RSA 2048 signing/verification
  - `generate_key_pair()`, `sign_sdf()`, `verify_sig()`
  - `export_public_key`, `export_private_key`, `import_public_key`, `import_private_key`
- **PDF generation**: `generate_pdf()` for visual.pdf (ReportLab)
- **Types**: `SDFMeta`, `SDFParseResult`, `SDFValidationResult`
- **Errors**: `SDFError`, `SDFValidationError`, `SDFSignatureError`
- **Examples**: `produce_invoice.py`, `read_invoice.py`, `sign_and_verify.py`
- **Tests**: `test_producer`, `test_reader`, `test_validator`, `test_signer`

### Requirements

- Python 3.11+
- jsonschema >= 4.21.0
- reportlab >= 4.0.0
- cryptography >= 42.0.0

---

[0.1.0]: https://github.com/etapsky/sdf/releases/tag/sdf-python-v0.1.0
