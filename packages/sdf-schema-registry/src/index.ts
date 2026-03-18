// ─── @etapsky/sdf-schema-registry ────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// SDF Schema Registry — versioned schema publication, diff, and migration.
// Submodule entry points are also available as deep imports:
//   @etapsky/sdf-schema-registry/registry
//   @etapsky/sdf-schema-registry/diff
//   @etapsky/sdf-schema-registry/migrate

// ─── Registry ─────────────────────────────────────────────────────────────────
export type {
  SchemaVersion,
  SchemaEntry,
  RegistryConfig,
  RegistryListResult,
} from './registry/index.js'
export { SchemaRegistry, defaultRegistry } from './registry/index.js'

// ─── Diff ─────────────────────────────────────────────────────────────────────
export type { ChangeType, SchemaChange, SchemaDiffResult } from './diff/index.js'
export { diffSchemas } from './diff/index.js'

// ─── Migrate ──────────────────────────────────────────────────────────────────
export type {
  MigrationTransform,
  MigrationRule,
  MigrationPlan,
  MigrationStep,
  MigrationResult,
} from './migrate/index.js'
export { MigrationEngine, defaultEngine } from './migrate/index.js'