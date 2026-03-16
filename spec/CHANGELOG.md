# Changelog

All notable changes to the SDF specification are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows the rules defined in `SDF_FORMAT.md` Section 10.

---

## [Unreleased]

### Planned for v0.2
- Digital signatures and key distribution (Phase 4)
- Data encryption for sensitive fields in `data.json`
- SDF Schema Registry — canonical schema publication at `etapsky.github.io`

### Planned for v0.3
- Binary attachment embedding
- Multi-language visual layers
- URL reference for visual layer (lightweight mode)

### Planned for v0.4
- Streaming / chunked SDF for large documents
- SDF Diff — structured change tracking between document versions

---

## [0.1.0] — 2026-03

### Added
- Initial draft specification (`SDF_FORMAT.md`)
- File structure definition: ZIP container with `visual.pdf`, `data.json`,
  `schema.json`, `meta.json`, and reserved `signature.sig`
- Required fields for `meta.json`: `sdf_version`, `document_id`, `issuer`,
  `created_at`
- Optional fields for `meta.json`: `document_type`, `document_version`,
  `issuer_id`, `recipient`, `recipient_id`, `schema_id`, `signature_algorithm`,
  `parent_document_id`, `expires_at`, `tags`
- JSON Schema Draft 2020-12 requirement for `schema.json`
- Producer flow — 7-step canonical flow with TypeScript pseudocode
- Consumer flow — 6-step canonical flow with TypeScript pseudocode
- Nomination matching section — `nomination_ref` field and matching flow
- Backward compatibility guarantees — PDF-only consumer support
- Versioning rules — MAJOR/MINOR semantics
- Security considerations — ZIP bomb protection, path traversal, content
  security, Phase 4 signature reservation
- Error code registry — 9 standardised error codes
- Reference implementation pointer — `@etapsky/sdf-kit`
- Design decisions and rationale — ZIP, JSON, schema bundling, meta separation,
  document_id semantics
- Comparison matrix with Classic PDF, XFA, ZUGFeRD, PDF/A-3
- Known limitations — file size, PDF rendering consistency, binary attachments,
  network effect
- Future work table
- Appendix A: normative `meta.json` JSON Schema
- Appendix B: minimal valid SDF file
- JSON Schema definitions in `schemas/`
- Reference examples for: invoice, nomination, purchase order,
  government tax declaration, customs declaration, permit application

---

*SDF Format Specification · Etapsky Inc. · github.com/etapsky/sdf*