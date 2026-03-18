// ─── Migrate Public API ───────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Barrel re-export for the @etapsky/sdf-schema-registry migrate submodule.

export type {
    MigrationTransform,
    MigrationRule,
    MigrationPlan,
    MigrationStep,
    MigrationResult,
  } from './migrate.js'
  
  export { MigrationEngine, defaultEngine } from './migrate.js'