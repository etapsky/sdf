// ─── SDF Producer ─────────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Implements the canonical producer flow from SDF_FORMAT.md Section 5.
// Steps: validate → generate PDF → assemble JSON files → pack ZIP → return buffer

import { randomUUID } from 'crypto';
import { packContainer } from './container.js';
import { generatePDF } from './pdf.js';
import { validateData } from './validator.js';
import {
  SDFArchive,
  SDFError,
  SDFMeta,
  SDFProducerOptions,
  SDF_ERRORS,
  SDF_VERSION,
} from './types.js';

// ─── buildSDF ─────────────────────────────────────────────────────────────────

export async function buildSDF(options: SDFProducerOptions): Promise<Buffer> {
  const { data, schema, issuer, issuerId, documentType, recipient, recipientId, schemaId, tags } = options;

  // Step 2 — Validate data against schema (SDF_FORMAT.md Section 5, Step 2)
  // Partial or invalid SDF files MUST NOT be written to disk or transmitted.
  const validation = validateData(data, schema);
  if (!validation.valid) {
    throw new SDFError(
      SDF_ERRORS.SCHEMA_MISMATCH,
      'Input data failed schema validation. SDF file was not produced.',
      validation.errors,
      'data.json',
    );
  }

  // Step 3 — Generate visual.pdf (SDF_FORMAT.md Section 5, Step 3)
  const meta = buildMeta({ issuer, issuerId, documentType, recipient, recipientId, schemaId, tags });
  const pdfBytes = await generatePDF({ meta, data });

  // Step 4 — Assemble JSON files (SDF_FORMAT.md Section 5, Step 4)
  const dataJson   = JSON.stringify(data,   null, 2);
  const schemaJson = JSON.stringify(schema, null, 2);
  const metaJson   = JSON.stringify(meta,   null, 2);

  // Step 5 — Pack ZIP archive (SDF_FORMAT.md Section 5, Step 5)
  // TODO: container-decision — currently uses ZIP via packContainer()
  const buffer = await packContainer({
    visualPdf:  pdfBytes,
    dataJson,
    schemaJson,
    metaJson,
  });

  return buffer;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMeta(options: Omit<SDFProducerOptions, 'data' | 'schema'>): SDFMeta {
  const meta: SDFMeta = {
    sdf_version:       SDF_VERSION,
    document_id:       randomUUID(),
    issuer:            options.issuer,
    created_at:        new Date().toISOString(),
    // Forward-compatibility marker for Phase 4 (SDF_FORMAT.md Section 4.7)
    signature_algorithm: null,
  };

  if (options.issuerId)      meta.issuer_id        = options.issuerId;
  if (options.documentType)  meta.document_type    = options.documentType;
  if (options.recipient)     meta.recipient        = options.recipient;
  if (options.recipientId)   meta.recipient_id     = options.recipientId;
  if (options.schemaId)      meta.schema_id        = options.schemaId;
  if (options.tags?.length)  meta.tags             = options.tags;

  return meta;
}

// ─── Re-export archive type for consumers ─────────────────────────────────────

export type { SDFArchive };