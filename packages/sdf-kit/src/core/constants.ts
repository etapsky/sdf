// ─── SDF Constants ────────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

// Current spec version (SDF_FORMAT.md Section 10.2)
export const SDF_VERSION = '0.1' as const;

// Required files at the archive root (SDF_FORMAT.md Section 4.2)
export const REQUIRED_FILES = [
  'visual.pdf',
  'data.json',
  'schema.json',
  'meta.json',
] as const;

export type RequiredFile = typeof REQUIRED_FILES[number];

// ZIP bomb protection limits (SDF_FORMAT.md Section 11.5)
export const MAX_FILE_SIZE_BYTES  = 50  * 1024 * 1024; // 50 MB per file
export const MAX_TOTAL_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB total

// MIME type and extension (SDF_FORMAT.md Section 4.1)
export const SDF_MIME_TYPE  = 'application/vnd.sdf' as const;
export const SDF_EXTENSION  = '.sdf' as const;

// Reserved top-level keys in data.json (SDF_FORMAT.md Section 4.4.1)
export const RESERVED_DATA_KEYS = ['_sdf', '_meta', '_signature'] as const;