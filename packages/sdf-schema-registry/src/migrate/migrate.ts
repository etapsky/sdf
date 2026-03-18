// ─── Schema Migration ─────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Transforms data.json payloads from one schema version to another.
// Migration rules are explicit — no magic inference.
// plan() computes required steps via diffSchemas(); migrate() executes them.
// Simple cases (optional additions, required-removed, metadata changes) are
// auto-handled without requiring an explicit MigrationRule.

import { diffSchemas, type SchemaChange } from '../diff/diff.js'

export type MigrationTransform = (
  data:    Record<string, unknown>,
  change:  SchemaChange,
) => Record<string, unknown>

export interface MigrationRule {
  /** The field path this rule applies to — e.g. "properties.invoice_number" */
  path:      string;
  /** Human-readable description of what this rule does */
  description: string;
  /** Transform function — receives data and change, returns updated data */
  transform: MigrationTransform;
}

export interface MigrationPlan {
  fromVersion: string;
  toVersion:   string;
  documentType: string;
  /** Ordered list of steps to apply */
  steps:       MigrationStep[];
  /** Whether all breaking changes have explicit rules */
  safe:        boolean;
  /** Breaking changes that have no explicit migration rule */
  unhandled:   SchemaChange[];
}

export interface MigrationStep {
  change:      SchemaChange;
  rule?:       MigrationRule;
  /** Auto-generated transform for simple cases */
  autoHandle:  boolean;
  description: string;
}

export interface MigrationResult {
  data:        Record<string, unknown>;
  applied:     MigrationStep[];
  warnings:    string[];
}

// ─── MigrationEngine ──────────────────────────────────────────────────────────

export class MigrationEngine {
  private rules: Map<string, MigrationRule> = new Map()

  /**
   * Register a migration rule for a specific field path.
   * Rules are keyed by path — e.g. "properties.issuer_name"
   */
  addRule(rule: MigrationRule): void {
    this.rules.set(rule.path, rule)
  }

  addRules(rules: MigrationRule[]): void {
    for (const rule of rules) this.addRule(rule)
  }

  /**
   * Build a migration plan from oldSchema → newSchema.
   * Returns a plan describing all required steps and whether they're handled.
   */
  plan(
    oldSchema:    Record<string, unknown>,
    newSchema:    Record<string, unknown>,
    documentType: string,
  ): MigrationPlan {
    const diff = diffSchemas(oldSchema, newSchema)
    const fromVersion = parseVersion(oldSchema.$id as string)
    const toVersion   = parseVersion(newSchema.$id as string)
    const steps: MigrationStep[] = []
    const unhandled: SchemaChange[] = []

    for (const change of diff.changes) {
      const rule     = this.rules.get(change.path)
      const canAuto  = canAutoHandle(change)

      if (rule) {
        steps.push({ change, rule, autoHandle: false, description: rule.description })
      } else if (canAuto) {
        steps.push({ change, autoHandle: true, description: autoDescription(change) })
      } else {
        unhandled.push(change)
        steps.push({
          change,
          autoHandle: false,
          description: `⚠ No migration rule for: ${change.message}`,
        })
      }
    }

    return {
      fromVersion,
      toVersion,
      documentType,
      steps,
      safe:      unhandled.filter(c => c.breaking).length === 0,
      unhandled: unhandled.filter(c => c.breaking),
    }
  }

  /**
   * Apply a migration plan to a data.json object.
   * Returns the migrated data and a log of applied steps.
   */
  migrate(
    data: Record<string, unknown>,
    plan: MigrationPlan,
  ): MigrationResult {
    let current = { ...data }
    const applied:  MigrationStep[] = []
    const warnings: string[] = []

    for (const step of plan.steps) {
      if (step.rule) {
        // Explicit rule
        try {
          current = step.rule.transform(current, step.change)
          applied.push(step)
        } catch (err) {
          warnings.push(`Rule failed for ${step.change.path}: ${String(err)}`)
        }
      } else if (step.autoHandle) {
        // Auto-handled
        current = applyAuto(current, step.change)
        applied.push(step)
      } else {
        // Not handled — add warning
        if (step.change.breaking) {
          warnings.push(`Breaking change not handled: ${step.change.message}`)
        }
      }
    }

    return { data: current, applied, warnings }
  }
}

// ─── Auto-handle logic ────────────────────────────────────────────────────────

function canAutoHandle(change: SchemaChange): boolean {
  switch (change.type) {
    case 'field_added':
      // Optional new fields can be safely ignored — no data transformation needed
      return !change.breaking
    case 'field_required_removed':
      // Field became optional — no data transformation needed
      return true
    case 'title_changed':
    case 'schema_id_changed':
      // Metadata changes — update schema_id in data if present
      return true
    default:
      return false
  }
}

function applyAuto(
  data:   Record<string, unknown>,
  change: SchemaChange,
): Record<string, unknown> {
  switch (change.type) {
    case 'field_added':
    case 'field_required_removed':
    case 'title_changed':
      // No data transformation needed
      return data
    case 'schema_id_changed':
      // If data has a schema_id reference, update it
      if (typeof data.schema_id === 'string') {
        return { ...data, schema_id: change.newValue }
      }
      return data
    default:
      return data
  }
}

function autoDescription(change: SchemaChange): string {
  switch (change.type) {
    case 'field_added':          return `New optional field "${change.path}" — no action needed`
    case 'field_required_removed': return `Field no longer required — no action needed`
    case 'title_changed':        return `Schema title updated — no data change`
    case 'schema_id_changed':    return `Schema $id updated — schema_id reference updated if present`
    default:                     return `Auto-handled: ${change.message}`
  }
}

function parseVersion(schemaId: string): string {
  const match = schemaId?.match(/v(\d+\.\d+)\.json$/)
  return match?.[1] ?? 'unknown'
}

// ─── Default singleton engine ─────────────────────────────────────────────────

export const defaultEngine = new MigrationEngine()