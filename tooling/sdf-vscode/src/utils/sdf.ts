// ─── SDF Parser Wrapper ──────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import { readFile } from 'fs/promises';
import type { SDFParseResult } from '@etapsky/sdf-kit';

/**
 * Load and parse an SDF file from disk.
 * Uses dynamic import to support @etapsky/sdf-kit (ESM) from CJS extension.
 */
export async function loadSDF(filePath: string): Promise<SDFParseResult> {
  const buffer = await readFile(filePath);
  const { parseSDF } = await import('@etapsky/sdf-kit');
  return parseSDF(buffer);
}
