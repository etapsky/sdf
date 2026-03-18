// ─── Schema Diff ──────────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Computes the structural difference between two JSON Schema versions.
// Detects breaking vs non-breaking changes per SDF_FORMAT.md Section 7.2.
// Breaking = consumers on the old schema version may stop working.
// Non-breaking = backwards-compatible additions or relaxations.

export type ChangeType =
  | 'field_added'
  | 'field_removed'
  | 'field_type_changed'
  | 'field_required_added'
  | 'field_required_removed'
  | 'field_constraint_tightened'
  | 'field_constraint_relaxed'
  | 'additional_properties_changed'
  | 'schema_id_changed'
  | 'title_changed'

export interface SchemaChange {
  type:       ChangeType;
  path:       string;           // JSON path to the changed field — e.g. "properties.issuer.name"
  breaking:   boolean;          // true = consumers on old version may break
  oldValue?:  unknown;
  newValue?:  unknown;
  message:    string;
}

export interface SchemaDiffResult {
  breaking:    boolean;         // true if any change is breaking
  changes:     SchemaChange[];
  summary: {
    total:     number;
    breaking:  number;
    nonBreaking: number;
  };
}

// ─── diffSchemas() ────────────────────────────────────────────────────────────

/**
 * Compute the diff between two JSON Schema versions.
 * oldSchema = the baseline (e.g. v0.1)
 * newSchema = the updated version (e.g. v0.2)
 */
export function diffSchemas(
  oldSchema: Record<string, unknown>,
  newSchema: Record<string, unknown>,
): SchemaDiffResult {
  const changes: SchemaChange[] = []

  // $id change
  if (oldSchema.$id !== newSchema.$id) {
    changes.push({
      type:     'schema_id_changed',
      path:     '$id',
      breaking: true,
      oldValue: oldSchema.$id,
      newValue: newSchema.$id,
      message:  `Schema $id changed from "${oldSchema.$id}" to "${newSchema.$id}"`,
    })
  }

  // title change (non-breaking)
  if (oldSchema.title !== newSchema.title) {
    changes.push({
      type:     'title_changed',
      path:     'title',
      breaking: false,
      oldValue: oldSchema.title,
      newValue: newSchema.title,
      message:  `Title changed from "${oldSchema.title}" to "${newSchema.title}"`,
    })
  }

  // additionalProperties change
  if (oldSchema.additionalProperties !== newSchema.additionalProperties) {
    const wasOpen   = oldSchema.additionalProperties !== false
    const isNowOpen = newSchema.additionalProperties !== false
    changes.push({
      type:     'additional_properties_changed',
      path:     'additionalProperties',
      breaking: wasOpen && !isNowOpen, // closing is breaking for producers sending extra fields
      oldValue: oldSchema.additionalProperties,
      newValue: newSchema.additionalProperties,
      message:  `additionalProperties changed: ${wasOpen ? 'open' : 'closed'} → ${isNowOpen ? 'open' : 'closed'}`,
    })
  }

  // required array changes
  const oldRequired = new Set((oldSchema.required as string[] | undefined) ?? [])
  const newRequired = new Set((newSchema.required as string[] | undefined) ?? [])

  for (const field of newRequired) {
    if (!oldRequired.has(field)) {
      changes.push({
        type:     'field_required_added',
        path:     `required[${field}]`,
        breaking: true, // existing producers may not send this field
        message:  `Field "${field}" is now required (was optional)`,
      })
    }
  }

  for (const field of oldRequired) {
    if (!newRequired.has(field)) {
      changes.push({
        type:     'field_required_removed',
        path:     `required[${field}]`,
        breaking: false,
        message:  `Field "${field}" is no longer required (now optional)`,
      })
    }
  }

  // properties diff
  const oldProps = (oldSchema.properties as Record<string, unknown> | undefined) ?? {}
  const newProps = (newSchema.properties as Record<string, unknown> | undefined) ?? {}

  const oldKeys = new Set(Object.keys(oldProps))
  const newKeys = new Set(Object.keys(newProps))

  // Added fields
  for (const key of newKeys) {
    if (!oldKeys.has(key)) {
      const isRequired = newRequired.has(key)
      changes.push({
        type:     'field_added',
        path:     `properties.${key}`,
        breaking: isRequired, // required new field = breaking for old producers
        newValue: newProps[key],
        message:  `Field "${key}" added${isRequired ? ' (required — breaking)' : ' (optional)'}`,
      })
    }
  }

  // Removed fields
  for (const key of oldKeys) {
    if (!newKeys.has(key)) {
      changes.push({
        type:     'field_removed',
        path:     `properties.${key}`,
        breaking: true, // consumers relying on this field will break
        oldValue: oldProps[key],
        message:  `Field "${key}" removed (breaking — consumers may rely on it)`,
      })
    }
  }

  // Changed fields
  for (const key of oldKeys) {
    if (!newKeys.has(key)) continue
    diffProperty(
      key,
      `properties.${key}`,
      oldProps[key] as Record<string, unknown>,
      newProps[key] as Record<string, unknown>,
      changes,
    )
  }

  const breaking    = changes.some(c => c.breaking)
  const breakingCnt = changes.filter(c => c.breaking).length

  return {
    breaking,
    changes,
    summary: {
      total:      changes.length,
      breaking:   breakingCnt,
      nonBreaking: changes.length - breakingCnt,
    },
  }
}

// ─── Property-level diff ──────────────────────────────────────────────────────

function diffProperty(
  key:      string,
  path:     string,
  oldProp:  Record<string, unknown>,
  newProp:  Record<string, unknown>,
  changes:  SchemaChange[],
): void {
  // Type change
  if (oldProp.type !== newProp.type) {
    changes.push({
      type:     'field_type_changed',
      path,
      breaking: true,
      oldValue: oldProp.type,
      newValue: newProp.type,
      message:  `Field "${key}" type changed: ${oldProp.type} → ${newProp.type}`,
    })
  }

  // minLength tightened (breaking for producers)
  if (
    typeof newProp.minLength === 'number' &&
    (typeof oldProp.minLength !== 'number' || newProp.minLength > oldProp.minLength)
  ) {
    changes.push({
      type:     'field_constraint_tightened',
      path:     `${path}.minLength`,
      breaking: true,
      oldValue: oldProp.minLength,
      newValue: newProp.minLength,
      message:  `Field "${key}" minLength tightened: ${oldProp.minLength ?? 'none'} → ${newProp.minLength}`,
    })
  }

  // minLength relaxed (non-breaking)
  if (
    typeof oldProp.minLength === 'number' &&
    (typeof newProp.minLength !== 'number' || newProp.minLength < oldProp.minLength)
  ) {
    changes.push({
      type:     'field_constraint_relaxed',
      path:     `${path}.minLength`,
      breaking: false,
      oldValue: oldProp.minLength,
      newValue: newProp.minLength,
      message:  `Field "${key}" minLength relaxed: ${oldProp.minLength} → ${newProp.minLength ?? 'none'}`,
    })
  }

  // enum / const changes
  const oldConst = oldProp.const
  const newConst = newProp.const
  if (oldConst !== undefined && newConst !== undefined && oldConst !== newConst) {
    changes.push({
      type:     'field_constraint_tightened',
      path:     `${path}.const`,
      breaking: true,
      oldValue: oldConst,
      newValue: newConst,
      message:  `Field "${key}" const changed: "${oldConst}" → "${newConst}"`,
    })
  }

  // format change
  if (oldProp.format !== newProp.format) {
    const isBreaking = newProp.format !== undefined && oldProp.format === undefined
    changes.push({
      type:     isBreaking ? 'field_constraint_tightened' : 'field_constraint_relaxed',
      path:     `${path}.format`,
      breaking: isBreaking,
      oldValue: oldProp.format,
      newValue: newProp.format,
      message:  `Field "${key}" format changed: ${oldProp.format ?? 'none'} → ${newProp.format ?? 'none'}`,
    })
  }
}