// ─── Container Abstraction ────────────────────────────────────────────────────
// TODO: container-decision
// This module wraps JSZip behind packContainer / unpackContainer.
// If the container format changes (ZIP → PDF metadata, QR/token, etc.),
// only this file needs to change. All callers remain untouched.

import JSZip from 'jszip';
import {
  SDFError,
  SDF_ERRORS,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_SIZE_BYTES,
} from './types.js';

// Required files at the archive root (SDF_FORMAT.md Section 4.2)
const REQUIRED_FILES = ['visual.pdf', 'data.json', 'schema.json', 'meta.json'] as const;

// Reserved paths — nothing else may appear at the archive root
const ALLOWED_ROOT_FILES = new Set([...REQUIRED_FILES, 'signature.sig']);

export interface ContainerContents {
  visualPdf:  Buffer;
  dataJson:   string;
  schemaJson: string;
  metaJson:   string;
}

// ─── Pack ─────────────────────────────────────────────────────────────────────

export async function packContainer(contents: ContainerContents): Promise<Buffer> {
  const zip = new JSZip();

  zip.file('visual.pdf',   contents.visualPdf,  { binary: true });
  zip.file('data.json',    contents.dataJson,    { binary: false });
  zip.file('schema.json',  contents.schemaJson,  { binary: false });
  zip.file('meta.json',    contents.metaJson,    { binary: false });

  const buffer = await zip.generateAsync({
    type:        'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return buffer;
}

// ─── Unpack ───────────────────────────────────────────────────────────────────

export async function unpackContainer(buffer: Buffer): Promise<ContainerContents> {
  // Step 1 — open ZIP (SDF_FORMAT.md Section 6, Step 1)
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new SDFError(
      SDF_ERRORS.NOT_ZIP,
      'File is not a valid ZIP archive.',
    );
  }

  // Path traversal check (SDF_FORMAT.md Section 11.4)
  for (const filePath of Object.keys(zip.files)) {
    if (filePath.includes('..') || filePath.includes('\\')) {
      throw new SDFError(
        SDF_ERRORS.INVALID_ARCHIVE,
        `Archive contains an invalid file path: ${filePath}`,
        undefined,
        filePath,
      );
    }
  }

  // ZIP bomb protection (SDF_FORMAT.md Section 11.5)
  let totalSize = 0;
  for (const [filePath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    const raw = await zipEntry.async('nodebuffer');
    if (raw.length > MAX_FILE_SIZE_BYTES) {
      throw new SDFError(
        SDF_ERRORS.ARCHIVE_TOO_LARGE,
        `File ${filePath} exceeds the maximum allowed size of 50 MB.`,
        undefined,
        filePath,
      );
    }
    totalSize += raw.length;
    if (totalSize > MAX_TOTAL_SIZE_BYTES) {
      throw new SDFError(
        SDF_ERRORS.ARCHIVE_TOO_LARGE,
        'Archive total uncompressed size exceeds the maximum allowed size of 200 MB.',
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

  // Vendor prefix is allowed; anything else at root is not
  for (const filePath of Object.keys(zip.files)) {
    if (zip.files[filePath].dir) continue;
    const isAllowed =
      ALLOWED_ROOT_FILES.has(filePath as typeof REQUIRED_FILES[number]) ||
      filePath.startsWith('vendor/');
    if (!isAllowed) {
      throw new SDFError(
        SDF_ERRORS.INVALID_ARCHIVE,
        `Unexpected file at archive root: "${filePath}". Only required files and vendor/ prefix are permitted.`,
        undefined,
        filePath,
      );
    }
  }

  // Extract contents
  const visualPdf  = await zip.file('visual.pdf')!.async('nodebuffer');
  const dataJson   = await zip.file('data.json')!.async('string');
  const schemaJson = await zip.file('schema.json')!.async('string');
  const metaJson   = await zip.file('meta.json')!.async('string');

  return { visualPdf, dataJson, schemaJson, metaJson };
}