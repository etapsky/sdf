// ─── SDF Core Types ───────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// These are the canonical type definitions for the F1 POC.
// In F2, these move to packages/sdf-kit/src/core/types.ts

export interface SDFMeta {
    sdf_version: string;
    document_id: string;
    issuer: string;
    created_at: string;
    // optional fields
    issuer_id?: string;
    document_type?: string;
    document_version?: string;
    recipient?: string;
    recipient_id?: string;
    schema_id?: string;
    signature_algorithm?: string | null;
    parent_document_id?: string;
    expires_at?: string;
    tags?: string[];
  }
  
  export interface SDFArchive {
    meta: SDFMeta;
    data: Record<string, unknown>;
    schema: Record<string, unknown>;
    pdfBytes: Uint8Array;
  }
  
  export interface SDFProducerOptions {
    data: Record<string, unknown>;
    schema: Record<string, unknown>;
    issuer: string;
    issuerId?: string;
    documentType?: string;
    recipient?: string;
    recipientId?: string;
    schemaId?: string;
    tags?: string[];
  }
  
  export interface SDFValidationResult {
    valid: boolean;
    errors: SDFValidationError[];
  }
  
  export interface SDFValidationError {
    code: string;
    message: string;
    details?: unknown;
    file?: string;
  }
  
  // ─── SDF Error Codes ──────────────────────────────────────────────────────────
  // Canonical error codes from SDF_FORMAT.md Section 12.1
  
  export const SDF_ERRORS = {
    NOT_ZIP:              'SDF_ERROR_NOT_ZIP',
    INVALID_META:         'SDF_ERROR_INVALID_META',
    MISSING_FILE:         'SDF_ERROR_MISSING_FILE',
    SCHEMA_MISMATCH:      'SDF_ERROR_SCHEMA_MISMATCH',
    INVALID_SCHEMA:       'SDF_ERROR_INVALID_SCHEMA',
    UNSUPPORTED_VERSION:  'SDF_ERROR_UNSUPPORTED_VERSION',
    INVALID_ARCHIVE:      'SDF_ERROR_INVALID_ARCHIVE',
    ARCHIVE_TOO_LARGE:    'SDF_ERROR_ARCHIVE_TOO_LARGE',
  } as const;
  
  export type SDFErrorCode = typeof SDF_ERRORS[keyof typeof SDF_ERRORS];
  
  export class SDFError extends Error {
    constructor(
      public readonly code: SDFErrorCode,
      message: string,
      public readonly details?: unknown,
      public readonly file?: string,
    ) {
      super(message);
      this.name = 'SDFError';
    }
  }
  
  // ─── Constants ────────────────────────────────────────────────────────────────
  
  export const SDF_VERSION = '0.1' as const;
  
  // ZIP bomb protection limits (from SDF_FORMAT.md Section 11.5)
  export const MAX_FILE_SIZE_BYTES   = 50  * 1024 * 1024; // 50 MB per file
  export const MAX_TOTAL_SIZE_BYTES  = 200 * 1024 * 1024; // 200 MB total