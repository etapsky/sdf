// ─── ZIP Container ────────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// TODO: container-decision
// Wraps JSZip behind packContainer / unpackContainer.
// If the container format changes, only this file changes.
// All callers use packContainer / unpackContainer — never JSZip directly.
// SDF_FORMAT.md Section 4.1 — Container Format.

import JSZip from 'jszip';
import {
  SDFError,
  SDF_ERRORS,
  REQUIRED_FILES,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_SIZE_BYTES,
  hasPathTraversal,
} from '../core/index.js';

export interface ContainerContents {
  visualPdf:  Uint8Array;
  dataJson:   string;
  schemaJson: string;
  metaJson:   string;
}

// Allowed root-level files (SDF_FORMAT.md Section 4.2)
const ALLOWED_ROOT = new Set([...REQUIRED_FILES, 'signature.sig']);

// ─── Pack ─────────────────────────────────────────────────────────────────────

export async function packContainer(contents: ContainerContents): Promise<Uint8Array> {
  const zip = new JSZip();

  zip.file('visual.pdf',  contents.visualPdf,  { binary: true });
  zip.file('data.json',   contents.dataJson,    { binary: false });
  zip.file('schema.json', contents.schemaJson,  { binary: false });
  zip.file('meta.json',   contents.metaJson,    { binary: false });

  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

// ─── Unpack ───────────────────────────────────────────────────────────────────

export async function unpackContainer(buffer: Buffer | Uint8Array): Promise<ContainerContents> {
  // Open ZIP (SDF_FORMAT.md Section 6, Step 1)
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new SDFError(SDF_ERRORS.NOT_ZIP, 'File is not a valid ZIP archive.');
  }

  // Path traversal check (SDF_FORMAT.md Section 11.4)
  for (const filePath of Object.keys(zip.files)) {
    if (hasPathTraversal(filePath)) {
      throw new SDFError(
        SDF_ERRORS.INVALID_ARCHIVE,
        `Archive contains an invalid file path: "${filePath}".`,
        undefined,
        filePath,
      );
    }
  }

  // ZIP bomb protection (SDF_FORMAT.md Section 11.5)
  let totalSize = 0;
  for (const [filePath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const raw = await entry.async('uint8array');
    if (raw.length > MAX_FILE_SIZE_BYTES) {
      throw new SDFError(
        SDF_ERRORS.ARCHIVE_TOO_LARGE,
        `File "${filePath}" exceeds the 50 MB per-file limit.`,
        undefined,
        filePath,
      );
    }
    totalSize += raw.length;
    if (totalSize > MAX_TOTAL_SIZE_BYTES) {
      throw new SDFError(
        SDF_ERRORS.ARCHIVE_TOO_LARGE,
        'Archive total uncompressed size exceeds the 200 MB limit.',
      );
    }
  }

  // Unexpected root-level files check (SDF_FORMAT.md Section 4.2)
  for (const filePath of Object.keys(zip.files)) {
    if (zip.files[filePath].dir) continue;
    const isAllowed =
      ALLOWED_ROOT.has(filePath as typeof REQUIRED_FILES[number]) ||
      filePath.startsWith('vendor/');
    if (!isAllowed) {
      throw new SDFError(
        SDF_ERRORS.INVALID_ARCHIVE,
        `Unexpected file at archive root: "${filePath}".`,
        undefined,
        filePath,
      );
    }
  }

  // Required files check (SDF_FORMAT.md Section 4.2)
  for (const required of REQUIRED_FILES) {
    if (!zip.file(required)) {
      throw new SDFError(
        SDF_ERRORS.MISSING_FILE,
        `Required file "${required}" is absent from the archive.`,
        undefined,
        required,
      );
    }
  }

  return {
    visualPdf:  await zip.file('visual.pdf')!.async('uint8array'),
    dataJson:   await zip.file('data.json')!.async('string'),
    schemaJson: await zip.file('schema.json')!.async('string'),
    metaJson:   await zip.file('meta.json')!.async('string'),
  };
}