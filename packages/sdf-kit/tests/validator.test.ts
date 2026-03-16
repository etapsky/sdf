import { describe, it, expect } from 'vitest';
import { validateMeta, validateSchema, validateSchemaOrThrow, checkVersion } from '../src/validator/index.js';
import { SDFError, SDF_ERRORS, SDF_VERSION } from '../src/core/index.js';

// ─── validateMeta ─────────────────────────────────────────────────────────────

describe('validateMeta', () => {
  const validMeta = {
    sdf_version:  '0.1',
    document_id:  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    issuer:       'Test Corp',
    created_at:   '2026-03-15T14:30:00Z',
  };

  it('accepts a valid minimal meta object', () => {
    expect(() => validateMeta(validMeta)).not.toThrow();
  });

  it('accepts meta with all optional fields', () => {
    expect(() => validateMeta({
      ...validMeta,
      issuer_id:           'DE123456789',
      document_type:       'invoice',
      document_version:    '1.0.0',
      recipient:           'Buyer Corp',
      recipient_id:        'CH-999',
      schema_id:           'https://etapsky.github.io/sdf/schemas/invoice/v0.1.json',
      signature_algorithm: null,
      tags:                ['q1-2026'],
    })).not.toThrow();
  });

  it('throws INVALID_META when sdf_version is missing', () => {
    const { sdf_version: _, ...rest } = validMeta;
    expect(() => validateMeta(rest)).toThrow(SDFError);
    try { validateMeta(rest); } catch (e) {
      expect((e as SDFError).code).toBe(SDF_ERRORS.INVALID_META);
    }
  });

  it('throws INVALID_META when document_id is not a UUID', () => {
    expect(() => validateMeta({ ...validMeta, document_id: 'not-a-uuid' }))
      .toThrow(SDFError);
  });

  it('throws INVALID_META when issuer is empty string', () => {
    expect(() => validateMeta({ ...validMeta, issuer: '' })).toThrow(SDFError);
  });

  it('throws INVALID_META when created_at is not a valid datetime', () => {
    expect(() => validateMeta({ ...validMeta, created_at: '2026-03-15' }))
      .toThrow(SDFError);
  });

  it('throws UNSUPPORTED_VERSION when major version is higher than supported', () => {
    expect(() => validateMeta({ ...validMeta, sdf_version: '99.0' }))
      .toThrow(SDFError);
    try { validateMeta({ ...validMeta, sdf_version: '99.0' }); } catch (e) {
      expect((e as SDFError).code).toBe(SDF_ERRORS.UNSUPPORTED_VERSION);
    }
  });

  it('throws INVALID_META when unknown fields are present', () => {
    expect(() => validateMeta({ ...validMeta, unknown_field: 'value' }))
      .toThrow(SDFError);
  });
});

// ─── validateSchema ───────────────────────────────────────────────────────────

describe('validateSchema', () => {
  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    required: ['name', 'amount'],
    properties: {
      name:   { type: 'string' },
      amount: { type: 'number', minimum: 0 },
    },
    additionalProperties: false,
  };

  it('returns valid:true for conforming data', () => {
    const result = validateSchema({ name: 'Test', amount: 100 }, schema);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid:false when required field is missing', () => {
    const result = validateSchema({ name: 'Test' }, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns valid:false when field type is wrong', () => {
    const result = validateSchema({ name: 42, amount: 100 }, schema);
    expect(result.valid).toBe(false);
  });

  it('returns valid:false when additional properties are present', () => {
    const result = validateSchema({ name: 'Test', amount: 100, extra: 'x' }, schema);
    expect(result.valid).toBe(false);
  });

  it('includes error details with field path and message', () => {
    const result = validateSchema({ name: 'Test' }, schema);
    expect(result.errors[0]).toMatchObject({
      code:    SDF_ERRORS.SCHEMA_MISMATCH,
      message: expect.stringContaining('amount'),
    });
  });

  it('throws INVALID_SCHEMA when schema itself is invalid', () => {
    expect(() => validateSchema({}, { $schema: 'invalid', type: 'not-a-type' }))
      .toThrow(SDFError);
    try {
      validateSchema({}, { $schema: 'invalid', type: 'not-a-type' });
    } catch (e) {
      expect((e as SDFError).code).toBe(SDF_ERRORS.INVALID_SCHEMA);
    }
  });
});

// ─── validateSchemaOrThrow ────────────────────────────────────────────────────

describe('validateSchemaOrThrow', () => {
  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  };

  it('does not throw for valid data', () => {
    expect(() => validateSchemaOrThrow({ id: 'abc' }, schema)).not.toThrow();
  });

  it('throws SDFValidationError for invalid data', () => {
    expect(() => validateSchemaOrThrow({}, schema)).toThrow(SDFError);
  });
});

// ─── checkVersion ─────────────────────────────────────────────────────────────

describe('checkVersion', () => {
  it('accepts the current version', () => {
    const result = checkVersion(SDF_VERSION);
    expect(result.supported).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it('accepts a lower minor version within same major', () => {
    const result = checkVersion('0.0');
    expect(result.supported).toBe(true);
  });

  it('returns a warning for a higher minor version within same major', () => {
    const result = checkVersion('0.99');
    expect(result.supported).toBe(true);
    expect(result.warning).toBeDefined();
  });

  it('throws UNSUPPORTED_VERSION for a higher major version', () => {
    expect(() => checkVersion('99.0')).toThrow(SDFError);
    try { checkVersion('99.0'); } catch (e) {
      expect((e as SDFError).code).toBe(SDF_ERRORS.UNSUPPORTED_VERSION);
    }
  });
});