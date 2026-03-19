// ─── Field Mapping Engine ─────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Maps SDF data.json fields to ERP target fields using dot-notation paths.
// Shared by all connector implementations — SAP, Oracle, and any future adapters.
// Also provides ERP-specific date formatters: toSAPDate (YYYYMMDD), toOracleDate (DD-MON-YYYY).

import type { FieldMapping, DocumentTypeMapping } from './types.js'

/**
 * Get a nested value from an object using dot notation.
 * e.g. get({ issuer: { name: 'Acme' } }, 'issuer.name') → 'Acme'
 */
export function get(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((curr, key) => {
    if (curr === null || curr === undefined) return undefined
    return (curr as Record<string, unknown>)[key]
  }, obj)
}

/**
 * Apply a list of FieldMappings to a source object.
 * Returns a flat Record with ERP target field names as keys.
 *
 * Skips null/undefined source values unless required=true,
 * in which case throws with the field path.
 */
export function applyMappings(
  source:   Record<string, unknown>,
  mappings: FieldMapping[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const mapping of mappings) {
    let value = get(source, mapping.from)

    if (value === null || value === undefined) {
      if (mapping.required) {
        throw new Error(`Required field "${mapping.from}" is missing in SDF data.json`)
      }
      continue
    }

    if (mapping.transform) {
      value = mapping.transform(value)
    }

    result[mapping.to] = value
  }

  return result
}

/**
 * Find the mapping for a given SDF document type.
 */
export function findMapping(
  mappings:     DocumentTypeMapping[],
  documentType: string,
): DocumentTypeMapping | undefined {
  return mappings.find(m => m.documentType === documentType)
}

/**
 * Format a monetary amount object { amount, currency } as a string.
 * Used by ERP mappers that expect "1250.00 EUR" or just "1250.00".
 */
export function formatMonetary(
  value:        unknown,
  includeCurrency = true,
): string {
  if (typeof value === 'object' && value !== null) {
    const m = value as { amount?: string; currency?: string }
    if (m.amount) {
      return includeCurrency && m.currency ? `${m.amount} ${m.currency}` : m.amount
    }
  }
  return String(value)
}

/**
 * Format an ISO date string to YYYYMMDD (SAP compact date format).
 */
export function toSAPDate(isoDate: unknown): string {
  return String(isoDate).replace(/-/g, '').slice(0, 8)
}

/**
 * Format an ISO date string to DD-MON-YYYY (Oracle date format).
 */
export function toOracleDate(isoDate: unknown): string {
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const d = new Date(String(isoDate))
  return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`
}