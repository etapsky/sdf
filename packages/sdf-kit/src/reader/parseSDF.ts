// ─── SDF Reader ───────────────────────────────────────────────────────────────
// Canonical consumer flow — SDF_FORMAT.md Section 6.
// Step 1: open ZIP → Step 2: read meta → Step 3: validate data
// → Step 4: route data → Step 5: present visual

import { unpackContainer } from '../producer/packZIP.js';
import { validateMeta } from '../validator/validateMeta.js';
import { validateSchemaOrThrow } from '../validator/validateSchema.js';
import {
  SDFError,
  SDFParseResult,
  SDF_ERRORS,
  safeParseJSON,
  isPlainObject,
} from '../core/index.js';

export async function parseSDF(buffer: Buffer | Uint8Array): Promise<SDFParseResult> {
  // Step 1 — Open ZIP archive
  // TODO: container-decision — currently ZIP via unpackContainer()
  const contents = await unpackContainer(buffer);

  // Step 2 — Read and validate meta.json
  const metaRaw = safeParseJSON(contents.metaJson);
  if (metaRaw === null) {
    throw new SDFError(SDF_ERRORS.INVALID_META, 'meta.json is not valid JSON.', undefined, 'meta.json');
  }
  validateMeta(metaRaw); // asserts metaRaw is SDFMeta

  // Step 3 — Parse and validate schema.json + data.json
  const schemaRaw = safeParseJSON(contents.schemaJson);
  if (!isPlainObject(schemaRaw)) {
    throw new SDFError(SDF_ERRORS.INVALID_SCHEMA, 'schema.json is not a valid JSON object.', undefined, 'schema.json');
  }

  const dataRaw = safeParseJSON(contents.dataJson);
  if (!isPlainObject(dataRaw)) {
    throw new SDFError(SDF_ERRORS.SCHEMA_MISMATCH, 'data.json is not a valid JSON object.', undefined, 'data.json');
  }

  validateSchemaOrThrow(dataRaw, schemaRaw);

  // Step 4+5 — Return structured result including visual.pdf bytes
  return {
    meta:     metaRaw,
    data:     dataRaw,
    schema:   schemaRaw,
    pdfBytes: contents.visualPdf,
  };
}