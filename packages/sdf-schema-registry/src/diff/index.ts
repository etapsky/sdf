// ─── Diff Public API ──────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Barrel re-export for the @etapsky/sdf-schema-registry diff submodule.

export type { ChangeType, SchemaChange, SchemaDiffResult } from './diff.js'
export { diffSchemas } from './diff.js'