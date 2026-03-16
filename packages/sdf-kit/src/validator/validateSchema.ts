// ─── Schema Validator ─────────────────────────────────────────────────────────
// Validates data.json against the bundled schema.json.
// SDF_FORMAT.md Section 7 — Schema & Validation.
// Uses ajv v8 with JSON Schema Draft 2020-12 (SDF_FORMAT.md Section 7.3).

import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
  SDFError,
  SDFValidationResult,
  SDF_ERRORS,
} from '../core/index.js';

function createAjv() {
  const instance = new Ajv({ allErrors: true, strict: false });
  addFormats(instance);
  return instance;
}

export function validateSchema(
  data:   unknown,
  schema: Record<string, unknown>,
): SDFValidationResult {
  const ajv = createAjv();
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

  if (!valid) {
    return {
      valid: false,
      errors: (validate.errors ?? []).map((e) => ({
        code:    SDF_ERRORS.SCHEMA_MISMATCH,
        message: `${e.instancePath || '(root)'} ${e.message ?? 'is invalid'}`,
        details: e,
        file:    'data.json',
      })),
    };
  }

  return { valid: true, errors: [] };
}

// Strict variant — throws on failure instead of returning result object
export function validateSchemaOrThrow(
  data:   unknown,
  schema: Record<string, unknown>,
): void {
  const result = validateSchema(data, schema);
  if (!result.valid) {
    throw new SDFError(
      SDF_ERRORS.SCHEMA_MISMATCH,
      'data.json failed validation against schema.json.',
      result.errors,
      'data.json',
    );
  }
}