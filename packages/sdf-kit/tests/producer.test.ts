// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { buildSDF } from '../src/producer/buildSDF.js';
import { packContainer, unpackContainer } from '../src/producer/packZIP.js';
import { SDFError, SDF_ERRORS, SDF_VERSION, REQUIRED_FILES } from '../src/core/index.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['document_type', 'title'],
  properties: {
    document_type: { type: 'string' },
    title:         { type: 'string' },
    amount:        {
      type: 'object',
      properties: {
        amount:   { type: 'string' },
        currency: { type: 'string' },
      },
    },
  },
  additionalProperties: false,
};

const VALID_DATA = {
  document_type: 'test_document',
  title:         'POC Test Document',
  amount:        { amount: '100.00', currency: 'EUR' },
};

const PRODUCER_OPTIONS = {
  data:         VALID_DATA,
  schema:       VALID_SCHEMA,
  issuer:       'Test Corp',
  issuerId:     'TC-001',
  documentType: 'test_document',
  recipient:    'Recipient Corp',
  schemaId:     'https://example.com/schema/v0.1.json',
  tags:         ['test', 'f2'],
};

// ─── buildSDF ─────────────────────────────────────────────────────────────────

describe('buildSDF', () => {
  it('produces a non-empty buffer', async () => {
    const buffer = await buildSDF(PRODUCER_OPTIONS);
    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('produces a valid ZIP archive', async () => {
    const buffer = await buildSDF(PRODUCER_OPTIONS);
    const zip = await JSZip.loadAsync(buffer);
    expect(zip).toBeDefined();
  });

  it('includes all required files in the archive', async () => {
    const buffer = await buildSDF(PRODUCER_OPTIONS);
    const zip    = await JSZip.loadAsync(buffer);
    for (const required of REQUIRED_FILES) {
      expect(zip.file(required)).not.toBeNull();
    }
  });

  it('meta.json contains correct sdf_version', async () => {
    const buffer   = await buildSDF(PRODUCER_OPTIONS);
    const zip      = await JSZip.loadAsync(buffer);
    const metaJson = await zip.file('meta.json')!.async('string');
    const meta     = JSON.parse(metaJson);
    expect(meta.sdf_version).toBe(SDF_VERSION);
  });

  it('meta.json contains a valid UUID v4 document_id', async () => {
    const buffer   = await buildSDF(PRODUCER_OPTIONS);
    const zip      = await JSZip.loadAsync(buffer);
    const metaJson = await zip.file('meta.json')!.async('string');
    const meta     = JSON.parse(metaJson);
    expect(meta.document_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('meta.json contains issuer and optional fields from options', async () => {
    const buffer   = await buildSDF(PRODUCER_OPTIONS);
    const zip      = await JSZip.loadAsync(buffer);
    const metaJson = await zip.file('meta.json')!.async('string');
    const meta     = JSON.parse(metaJson);
    expect(meta.issuer).toBe('Test Corp');
    expect(meta.issuer_id).toBe('TC-001');
    expect(meta.document_type).toBe('test_document');
    expect(meta.recipient).toBe('Recipient Corp');
    expect(meta.tags).toEqual(['test', 'f2']);
  });

  it('meta.json has signature_algorithm set to null (Phase 4 marker)', async () => {
    const buffer   = await buildSDF(PRODUCER_OPTIONS);
    const zip      = await JSZip.loadAsync(buffer);
    const metaJson = await zip.file('meta.json')!.async('string');
    const meta     = JSON.parse(metaJson);
    expect(meta.signature_algorithm).toBeNull();
  });

  it('data.json matches the input data exactly', async () => {
    const buffer   = await buildSDF(PRODUCER_OPTIONS);
    const zip      = await JSZip.loadAsync(buffer);
    const dataJson = await zip.file('data.json')!.async('string');
    const data     = JSON.parse(dataJson);
    expect(data).toEqual(VALID_DATA);
  });

  it('schema.json matches the input schema exactly', async () => {
    const buffer     = await buildSDF(PRODUCER_OPTIONS);
    const zip        = await JSZip.loadAsync(buffer);
    const schemaJson = await zip.file('schema.json')!.async('string');
    const schema     = JSON.parse(schemaJson);
    expect(schema).toEqual(VALID_SCHEMA);
  });

  it('visual.pdf is present and non-empty', async () => {
    const buffer  = await buildSDF(PRODUCER_OPTIONS);
    const zip     = await JSZip.loadAsync(buffer);
    const pdfBytes = await zip.file('visual.pdf')!.async('nodebuffer');
    expect(pdfBytes.length).toBeGreaterThan(0);
  });

  it('generates unique document_id on each call', async () => {
    const [buf1, buf2] = await Promise.all([
      buildSDF(PRODUCER_OPTIONS),
      buildSDF(PRODUCER_OPTIONS),
    ]);
    const zip1 = await JSZip.loadAsync(buf1);
    const zip2 = await JSZip.loadAsync(buf2);
    const meta1 = JSON.parse(await zip1.file('meta.json')!.async('string'));
    const meta2 = JSON.parse(await zip2.file('meta.json')!.async('string'));
    expect(meta1.document_id).not.toBe(meta2.document_id);
  });

  it('throws SCHEMA_MISMATCH when data does not conform to schema', async () => {
    await expect(buildSDF({
      ...PRODUCER_OPTIONS,
      data: { document_type: 'test', wrong_field: 'x' },
    })).rejects.toThrow(SDFError);

    try {
      await buildSDF({ ...PRODUCER_OPTIONS, data: { bad: 'data' } });
    } catch (e) {
      expect((e as SDFError).code).toBe(SDF_ERRORS.SCHEMA_MISMATCH);
    }
  });
});

// ─── packContainer / unpackContainer ─────────────────────────────────────────

describe('packContainer / unpackContainer — round trip', () => {
  const contents = {
    visualPdf:  Buffer.from('%PDF-1.4 test'),
    dataJson:   JSON.stringify({ hello: 'world' }),
    schemaJson: JSON.stringify({ type: 'object' }),
    metaJson:   JSON.stringify({
      sdf_version: '0.1',
      document_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      issuer: 'Test',
      created_at: '2026-01-01T00:00:00Z',
    }),
  };

  it('packs and unpacks contents identically', async () => {
    const buffer   = await packContainer(contents);
    const unpacked = await unpackContainer(buffer);
    expect(unpacked.dataJson).toBe(contents.dataJson);
    expect(unpacked.schemaJson).toBe(contents.schemaJson);
    expect(unpacked.metaJson).toBe(contents.metaJson);
  });

  it('throws NOT_ZIP for non-ZIP buffer', async () => {
    await expect(unpackContainer(Buffer.from('not a zip'))).rejects.toThrow(SDFError);
    try {
      await unpackContainer(Buffer.from('not a zip'));
    } catch (e) {
      expect((e as SDFError).code).toBe(SDF_ERRORS.NOT_ZIP);
    }
  });

  it('throws MISSING_FILE when a required file is absent', async () => {
    const zip = new JSZip();
    zip.file('visual.pdf',  Buffer.from('%PDF'));
    zip.file('data.json',   '{}');
    zip.file('schema.json', '{}');
    // meta.json intentionally omitted
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(unpackContainer(buf)).rejects.toThrow(SDFError);
    try {
      await unpackContainer(buf);
    } catch (e) {
      expect((e as SDFError).code).toBe(SDF_ERRORS.MISSING_FILE);
    }
  });

  it('throws INVALID_ARCHIVE on path traversal', async () => {
    const zip = new JSZip();
    zip.file('visual.pdf',    Buffer.from('%PDF'));
    zip.file('data.json',     '{}');
    zip.file('schema.json',   '{}');
    zip.file('meta.json',     '{}');
    zip.file('../evil.json',  '{}');
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(unpackContainer(buf)).rejects.toThrow(SDFError);
    try {
      await unpackContainer(buf);
    } catch (e) {
      expect((e as SDFError).code).toBe(SDF_ERRORS.INVALID_ARCHIVE);
    }
  });

  it('throws INVALID_ARCHIVE for unexpected root-level files', async () => {
    const zip = new JSZip();
    zip.file('visual.pdf',  Buffer.from('%PDF'));
    zip.file('data.json',   '{}');
    zip.file('schema.json', '{}');
    zip.file('meta.json',   '{}');
    zip.file('rogue.txt',   'bad');
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(unpackContainer(buf)).rejects.toThrow(SDFError);
    try {
      await unpackContainer(buf);
    } catch (e) {
      expect((e as SDFError).code).toBe(SDF_ERRORS.INVALID_ARCHIVE);
    }
  });

  it('allows vendor/ prefix files alongside required files', async () => {
    const zip = new JSZip();
    zip.file('visual.pdf',            Buffer.from('%PDF'));
    zip.file('data.json',             '{}');
    zip.file('schema.json',           '{}');
    zip.file('meta.json',             '{}');
    zip.file('vendor/custom.json',    '{}');
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(unpackContainer(buf)).resolves.toBeDefined();
  });
});
