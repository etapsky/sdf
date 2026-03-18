// ─── Registry Public API ──────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Barrel re-export for the @etapsky/sdf-schema-registry registry submodule.

export type {
    SchemaVersion,
    SchemaEntry,
    RegistryConfig,
    RegistryListResult,
  } from './types.js'
  
  export { SchemaRegistry, defaultRegistry } from './registry.js'