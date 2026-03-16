// ─── Schema Validator ─────────────────────────────────────────────────────────
// Uses ajv (Ajv v8) with JSON Schema Draft 2020-12.
// SDF_FORMAT.md Section 7.3: Node.js / Browser → ajv (Ajv v8, JSON Schema 2020-12)

import Ajv, { type ErrorObject } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
  SDFError,
  SDFMeta,
  SDFValidationResult,
  SDF_ERRORS,
  SDF_VERSION,
} from './types.js';

// Singleton ajv instance — reused across calls for performance
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// ─── Data validation ──────────────────────────────────────────────────────────

export function validateData(
  data: unknown,
  schema: Record<string, unknown>,
): SDFValidationResult {
  let validate: ReturnType<typeof ajv.compile>;

  try {
    validate = ajv.compile(schema);
  } catch (err) {
    throw new SDFError(
      SDF_ERRORS.INVALID_SCHEMA,
      'schema.json is not a valid JSON Schema document.',
      err,
      'schema.json',
    );
  }

  const valid = validate(data);

  return {
    valid: Boolean(valid),
    errors: valid ? [] : formatErrors(validate.errors ?? []),
  };
}

// ─── Meta validation ──────────────────────────────────────────────────────────

const META_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
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

export function validateMeta(meta: unknown): asserts meta is SDFMeta {
  const validate = ajv.compile(META_SCHEMA);
  const valid = validate(meta);

  if (!valid) {
    throw new SDFError(
      SDF_ERRORS.INVALID_META,
      'meta.json is missing required fields or contains invalid values.',
      formatErrors(validate.errors ?? []),
      'meta.json',
    );
  }

  // Version check (SDF_FORMAT.md Section 9.3)
  const [major] = (meta as SDFMeta).sdf_version.split('.').map(Number);
  const [currentMajor] = SDF_VERSION.split('.').map(Number);

  if (major > currentMajor) {
    throw new SDFError(
      SDF_ERRORS.UNSUPPORTED_VERSION,
      `SDF version ${(meta as SDFMeta).sdf_version} is higher than the supported maximum (${SDF_VERSION}).`,
      undefined,
      'meta.json',
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatErrors(errors: ErrorObject[]) {
  return errors.map((e) => ({
    code:    SDF_ERRORS.SCHEMA_MISMATCH,
    message: `${e.instancePath || '(root)'} ${e.message ?? 'is invalid'}`,
    details: e,
  }));
}