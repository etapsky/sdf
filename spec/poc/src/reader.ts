// ─── SDF Reader ───────────────────────────────────────────────────────────────
// Implements the canonical consumer flow from SDF_FORMAT.md Section 6.
// Steps: open ZIP → read meta → validate data → return structured result

import { unpackContainer } from './container.js';
import { validateData, validateMeta } from './validator.js';
import {
  SDFArchive,
  SDFError,
  SDF_ERRORS,
} from './types.js';

// ─── parseSDF ─────────────────────────────────────────────────────────────────

export async function parseSDF(buffer: Buffer): Promise<SDFArchive> {
  // Step 1 — Open ZIP archive (SDF_FORMAT.md Section 6, Step 1)
  // TODO: container-decision — currently uses ZIP via unpackContainer()
  const contents = await unpackContainer(buffer);

  // Step 2 — Read and validate meta.json (SDF_FORMAT.md Section 6, Step 2)
  let meta: unknown;
  try {
    meta = JSON.parse(contents.metaJson);
  } catch {
    throw new SDFError(
      SDF_ERRORS.INVALID_META,
      'meta.json is not valid JSON.',
      undefined,
      'meta.json',
    );
  }
  validateMeta(meta); // throws SDFError if invalid — meta is now SDFMeta

  // Step 3 — Validate data.json against schema.json (SDF_FORMAT.md Section 6, Step 3)
  let schema: Record<string, unknown>;
  let data: Record<string, unknown>;

  try {
    schema = JSON.parse(contents.schemaJson) as Record<string, unknown>;
  } catch {
    throw new SDFError(
      SDF_ERRORS.INVALID_SCHEMA,
      'schema.json is not valid JSON.',
      undefined,
      'schema.json',
    );
  }

  try {
    data = JSON.parse(contents.dataJson) as Record<string, unknown>;
  } catch {
    throw new SDFError(
      SDF_ERRORS.SCHEMA_MISMATCH,
      'data.json is not valid JSON.',
      undefined,
      'data.json',
    );
  }

  const validation = validateData(data, schema);
  if (!validation.valid) {
    throw new SDFError(
      SDF_ERRORS.SCHEMA_MISMATCH,
      'data.json failed validation against schema.json.',
      validation.errors,
      'data.json',
    );
  }

  // Step 4 — Return structured result (SDF_FORMAT.md Section 6, Step 4 & 5)
  return {
    meta,
    data,
    schema,
    pdfBytes: contents.visualPdf,
  };
}

// ─── extractJSON ──────────────────────────────────────────────────────────────
// Partial read mode (SDF_FORMAT.md Section 12.3):
// Extracts meta + data without reading visual.pdf.
// Useful for high-throughput server-side ingestion where the PDF is not needed.

export async function extractJSON(buffer: Buffer): Promise<Pick<SDFArchive, 'meta' | 'data' | 'schema'>> {
  const result = await parseSDF(buffer);
  return { meta: result.meta, data: result.data, schema: result.schema };
}