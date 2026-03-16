// ─── Partial Read ─────────────────────────────────────────────────────────────
// Extracts meta + data + schema without reading visual.pdf.
// SDF_FORMAT.md Section 12.3 — Partial Reads.
// Use for high-throughput server-side ingestion where the PDF is never needed.

import { parseSDF } from './parseSDF.js';
import { SDFParseResult } from '../core/index.js';

export type JSONOnlyResult = Omit<SDFParseResult, 'pdfBytes'>;

export async function extractJSON(buffer: Buffer): Promise<JSONOnlyResult> {
  const { meta, data, schema } = await parseSDF(buffer);
  return { meta, data, schema };
}