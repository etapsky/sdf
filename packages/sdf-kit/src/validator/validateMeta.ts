// ─── Meta Validator ───────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Validates meta.json against the normative SDF Meta Schema.
// SDF_FORMAT.md Section 4.6 and Appendix A.

import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { SDFError, SDFMeta, SDF_ERRORS, SDF_VERSION } from '../core/index.js';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Normative meta.json schema (SDF_FORMAT.md Appendix A)
const META_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://etapsky.github.io/sdf/schemas/meta.schema.json',
  type: 'object',
  required: ['sdf_version', 'document_id', 'issuer', 'created_at'],
  properties: {
    sdf_version:         { type: 'string', pattern: '^\\d+\\.\\d+$' },
    document_id:         { type: 'string', format: 'uuid' },
    issuer:              { type: 'string', minLength: 1 },
    created_at:          { type: 'string', format: 'date-time' },
    document_type:       { type: 'string' },
    document_version:    { type: 'string' },
    issuer_id:           { type: 'string' },
    recipient:           { type: 'string' },
    recipient_id:        { type: 'string' },
    schema_id:           { type: 'string', format: 'uri' },
    signature_algorithm: { type: ['string', 'null'] },
    parent_document_id:  { type: 'string', format: 'uuid' },
    expires_at:          { type: 'string', format: 'date-time' },
    tags:                { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
};

const validateMetaSchema = ajv.compile(META_SCHEMA);

export function validateMeta(meta: unknown): asserts meta is SDFMeta {
  if (!validateMetaSchema(meta)) {
    throw new SDFError(
      SDF_ERRORS.INVALID_META,
      'meta.json is missing required fields or contains invalid values.',
      validateMetaSchema.errors,
      'meta.json',
    );
  }

  // Version check (SDF_FORMAT.md Section 9.3)
  const [fileMajor] = ((meta as unknown) as SDFMeta).sdf_version.split('.').map(Number);
  const [currentMajor] = SDF_VERSION.split('.').map(Number);

  if (fileMajor > currentMajor) {
    throw new SDFError(
      SDF_ERRORS.UNSUPPORTED_VERSION,
      `SDF version ${((meta as unknown) as SDFMeta).sdf_version} is not supported. Maximum supported version is ${SDF_VERSION}.`,
      undefined,
      'meta.json',
    );
  }
}