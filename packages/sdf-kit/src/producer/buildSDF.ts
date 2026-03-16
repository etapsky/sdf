// ─── SDF Producer ─────────────────────────────────────────────────────────────
// Canonical producer flow — SDF_FORMAT.md Section 5.
// Step 1: collect → Step 2: validate → Step 3: generate PDF
// → Step 4: assemble JSON → Step 5: pack ZIP → Step 7: return buffer

import { randomUUID } from 'crypto';
import { packContainer } from './packZIP.js';
import { generatePDF } from './generatePDF.js';
import { validateSchemaOrThrow } from '../validator/validateSchema.js';
import {
  SDFMeta,
  SDFProducerOptions,
  SDF_VERSION,
} from '../core/index.js';

export async function buildSDF(options: SDFProducerOptions): Promise<Uint8Array> {
  const {
    data, schema,
    issuer, issuerId,
    documentType, recipient, recipientId,
    schemaId, tags,
  } = options;

  // Step 2 — Validate against schema
  // Partial or invalid SDF files MUST NOT be written to disk or transmitted.
  validateSchemaOrThrow(data, schema);

  // Step 3 — Generate visual.pdf
  const meta = buildMeta({ issuer, issuerId, documentType, recipient, recipientId, schemaId, tags });
  const pdfBytes = await generatePDF({ meta, data });

  // Step 4 — Assemble JSON files
  const dataJson   = JSON.stringify(data,   null, 2);
  const schemaJson = JSON.stringify(schema, null, 2);
  const metaJson   = JSON.stringify(meta,   null, 2);

  // Step 5 — Pack ZIP archive
  // TODO: container-decision — currently ZIP via packContainer()
  return packContainer({ visualPdf: pdfBytes, dataJson, schemaJson, metaJson });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMeta(options: Omit<SDFProducerOptions, 'data' | 'schema'>): SDFMeta {
  const meta: SDFMeta = {
    sdf_version:         SDF_VERSION,
    document_id:         randomUUID(),
    issuer:              options.issuer,
    created_at:          new Date().toISOString(),
    signature_algorithm: null, // Phase 4 forward-compatibility marker
  };

  if (options.issuerId)     meta.issuer_id     = options.issuerId;
  if (options.documentType) meta.document_type  = options.documentType;
  if (options.recipient)    meta.recipient      = options.recipient;
  if (options.recipientId)  meta.recipient_id   = options.recipientId;
  if (options.schemaId)     meta.schema_id      = options.schemaId;
  if (options.tags?.length) meta.tags           = options.tags;

  return meta;
}