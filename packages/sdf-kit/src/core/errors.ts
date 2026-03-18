// ─── SDF Error Codes ──────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Canonical error codes from SDF_FORMAT.md Section 12.1.
// All conforming implementations MUST use these codes.

export const SDF_ERRORS = {
    NOT_ZIP:             'SDF_ERROR_NOT_ZIP',
    INVALID_META:        'SDF_ERROR_INVALID_META',
    MISSING_FILE:        'SDF_ERROR_MISSING_FILE',
    SCHEMA_MISMATCH:     'SDF_ERROR_SCHEMA_MISMATCH',
    INVALID_SCHEMA:      'SDF_ERROR_INVALID_SCHEMA',
    UNSUPPORTED_VERSION: 'SDF_ERROR_UNSUPPORTED_VERSION',
    INVALID_SIGNATURE:   'SDF_ERROR_INVALID_SIGNATURE',  // Phase 4
    INVALID_ARCHIVE:     'SDF_ERROR_INVALID_ARCHIVE',
    ARCHIVE_TOO_LARGE:   'SDF_ERROR_ARCHIVE_TOO_LARGE',
  } as const;
  
  export type SDFErrorCode = typeof SDF_ERRORS[keyof typeof SDF_ERRORS];
  
  // ─── SDFError class ───────────────────────────────────────────────────────────
  // Structured error object (SDF_FORMAT.md Section 12.2)
  
  export class SDFError extends Error {
    public readonly code:     SDFErrorCode;
    public readonly details?: unknown;
    public readonly file?:    string;
  
    constructor(
      code:      SDFErrorCode,
      message:   string,
      details?:  unknown,
      file?:     string,
    ) {
      super(message);
      this.name    = 'SDFError';
      this.code    = code;
      this.details = details;
      this.file    = file;
    }
  
    toJSON() {
      return {
        code:    this.code,
        message: this.message,
        ...(this.details !== undefined && { details: this.details }),
        ...(this.file    !== undefined && { file:    this.file }),
      };
    }
  }
  
  export class SDFValidationError extends SDFError {
    constructor(errors: unknown[], file?: string) {
      super(
        SDF_ERRORS.SCHEMA_MISMATCH,
        'data.json failed validation against schema.json.',
        errors,
        file,
      );
      this.name = 'SDFValidationError';
    }
  }