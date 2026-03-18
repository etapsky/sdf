// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { buildSDF } from '../src/producer/buildSDF.js';
import { parseSDF } from '../src/reader/parseSDF.js';
import { extractJSON } from '../src/reader/extractJSON.js';
import { SDFError, SDF_ERRORS, SDF_VERSION } from '../src/core/index.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://etapsky.github.io/sdf/schemas/test/v0.1.json',
  title: 'Test Document',
  type: 'object',
  required: ['document_type', 'title'],
  properties: {
    document_type: { type: 'string' },
    title:         { type: 'string' },
  },
  additionalProperties: false,
};

const DATA = {
  document_type: 'test_document',
  title:         'Round-trip test',
};

const OPTIONS = {
  data:         DATA,
  schema:       SCHEMA,
  issuer:       'Test Corp',
  issuerId:     'TC-001',
  documentType: 'test_document',
  recipient:    'Recipient Corp',
  schemaId:     'https://etapsky.github.io/sdf/schemas/test/v0.1.json',
  tags:         ['test'],
};

// ─── parseSDF ─────────────────────────────────────────────────────────────────

describe('parseSDF', () => {
  it('parses a valid SDF file and returns all layers', async () => {
    const buffer = await buildSDF(OPTIONS);
    const result = await parseSDF(buffer);

    expect(result.meta).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.schema).toBeDefined();
    expect(result.pdfBytes).toBeDefined();
  });

  it('meta.sdf_version matches the current version', async () => {
    const buffer = await buildSDF(OPTIONS);
    const result = await parseSDF(buffer);
    expect(result.meta.sdf_version).toBe(SDF_VERSION);
  });

  it('data matches the original input exactly', async () => {
    const buffer = await buildSDF(OPTIONS);
    const result = await parseSDF(buffer);
    expect(result.data).toEqual(DATA);
  });

  it('schema matches the original schema exactly', async () => {
    const buffer = await buildSDF(OPTIONS);
    const result = await parseSDF(buffer);
    expect(result.schema).toEqual(SCHEMA);
  });

  it('pdfBytes is a non-empty Uint8Array', async () => {
    const buffer = await buildSDF(OPTIONS);
    const result = await parseSDF(buffer);
    expect(result.pdfBytes.length).toBeGreaterThan(0);
  });

  it('meta contains optional fields set in producer options', async () => {
    const buffer = await buildSDF(OPTIONS);
    const result = await parseSDF(buffer);
    expect(result.meta.issuer).toBe('Test Corp');
    expect(result.meta.issuer_id).toBe('TC-001');
    expect(result.meta.document_type).toBe('test_document');
    expect(result.meta.recipient).toBe('Recipient Corp');
    expect(result.meta.tags).toEqual(['test']);
  });

  it('throws NOT_ZIP for an invalid buffer', async () => {
    await expect(parseSDF(Buffer.from('not a zip'))).rejects.toThrow(SDFError);
    try {
      await parseSDF(Buffer.from('not a zip'));
    } catch (e) {
      expect((e as SDFError).code).toBe(SDF_ERRORS.NOT_ZIP);
    }
  });

  it('throws INVALID_META when meta.json is corrupt', async () => {
    const zip = new JSZip();
    zip.file('visual.pdf',  Buffer.from('%PDF-1.4'));
    zip.file('data.json',   JSON.stringify(DATA));
    zip.file('schema.json', JSON.stringify(SCHEMA));
    zip.file('meta.json',   'not valid json {{{');
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(parseSDF(buf)).rejects.toThrow(SDFError);
    try {
      await parseSDF(buf);
    } catch (e) {
      expect((e as SDFError).code).toBe(SDF_ERRORS.INVALID_META);
    }
  });

  it('throws INVALID_META when required meta fields are missing', async () => {
    const zip = new JSZip();
    zip.file('visual.pdf',  Buffer.from('%PDF-1.4'));
    zip.file('data.json',   JSON.stringify(DATA));
    zip.file('schema.json', JSON.stringify(SCHEMA));
    zip.file('meta.json',   JSON.stringify({ sdf_version: '0.1' })); // missing required fields
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(parseSDF(buf)).rejects.toThrow(SDFError);
    try {
      await parseSDF(buf);
    } catch (e) {
      expect((e as SDFError).code).toBe(SDF_ERRORS.INVALID_META);
    }
  });

  it('throws SCHEMA_MISMATCH when data.json does not conform to schema.json', async () => {
    const zip = new JSZip();
    zip.file('visual.pdf',  Buffer.from('%PDF-1.4'));
    zip.file('data.json',   JSON.stringify({ wrong_field: true }));
    zip.file('schema.json', JSON.stringify(SCHEMA));
    zip.file('meta.json',   JSON.stringify({
      sdf_version: '0.1',
      document_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      issuer:      'Test',
      created_at:  '2026-01-01T00:00:00Z',
    }));
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(parseSDF(buf)).rejects.toThrow(SDFError);
    try {
      await parseSDF(buf);
    } catch (e) {
      expect((e as SDFError).code).toBe(SDF_ERRORS.SCHEMA_MISMATCH);
    }
  });

  it('throws UNSUPPORTED_VERSION for a future major version', async () => {
    const zip = new JSZip();
    zip.file('visual.pdf',  Buffer.from('%PDF-1.4'));
    zip.file('data.json',   JSON.stringify(DATA));
    zip.file('schema.json', JSON.stringify(SCHEMA));
    zip.file('meta.json',   JSON.stringify({
      sdf_version: '99.0',
      document_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      issuer:      'Test',
      created_at:  '2026-01-01T00:00:00Z',
    }));
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(parseSDF(buf)).rejects.toThrow(SDFError);
    try {
      await parseSDF(buf);
    } catch (e) {
      expect((e as SDFError).code).toBe(SDF_ERRORS.UNSUPPORTED_VERSION);
    }
  });
});

// ─── extractJSON ──────────────────────────────────────────────────────────────

describe('extractJSON', () => {
  it('returns meta, data, schema — but not pdfBytes', async () => {
    const buffer = await buildSDF(OPTIONS);
    const result = await extractJSON(buffer);

    expect(result.meta).toBeDefined();
    expect(result.data).toEqual(DATA);
    expect(result.schema).toEqual(SCHEMA);
    expect((result as Record<string, unknown>).pdfBytes).toBeUndefined();
  });

  it('still validates data against schema during extraction', async () => {
    const zip = new JSZip();
    zip.file('visual.pdf',  Buffer.from('%PDF-1.4'));
    zip.file('data.json',   JSON.stringify({ invalid: true }));
    zip.file('schema.json', JSON.stringify(SCHEMA));
    zip.file('meta.json',   JSON.stringify({
      sdf_version: '0.1',
      document_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      issuer:      'Test',
      created_at:  '2026-01-01T00:00:00Z',
    }));
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(extractJSON(buf)).rejects.toThrow(SDFError);
  });
});

// ─── Round-trip ───────────────────────────────────────────────────────────────

describe('producer → reader round-trip', () => {
  it('produces a file that can be parsed back without errors', async () => {
    const buffer = await buildSDF(OPTIONS);
    await expect(parseSDF(buffer)).resolves.toBeDefined();
  });

  it('data is preserved exactly through the round-trip', async () => {
    const buffer = await buildSDF(OPTIONS);
    const result = await parseSDF(buffer);
    expect(result.data).toEqual(DATA);
  });

  it('document_id is stable — same value in parsed meta', async () => {
    const buffer = await buildSDF(OPTIONS);
    const result = await parseSDF(buffer);
    // document_id must be a UUID v4
    expect(result.meta.document_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
