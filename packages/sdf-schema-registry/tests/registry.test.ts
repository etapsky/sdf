// ─── Schema Registry Tests ────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Tests for SchemaRegistry, diffSchemas, and MigrationEngine.
// Covers registration, resolution, listing, validation, schema diffing,
// migration planning, auto-handling, and explicit rule application.

import { describe, it, expect, beforeEach } from 'vitest'
import { SchemaRegistry } from '../src/registry/registry.js'
import { diffSchemas } from '../src/diff/diff.js'
import { MigrationEngine } from '../src/migrate/migrate.js'

// ─── Test schemas ─────────────────────────────────────────────────────────────

const INVOICE_V01: Record<string, unknown> = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id:     'https://etapsky.github.io/sdf/schemas/invoice/v0.1.json',
  title:   'SDF Invoice',
  type:    'object',
  required: ['document_type', 'invoice_number', 'issuer'],
  properties: {
    document_type:  { type: 'string', const: 'invoice' },
    invoice_number: { type: 'string', minLength: 1 },
    issuer:         { type: 'object' },
    due_date:       { type: 'string', format: 'date' },
  },
  additionalProperties: false,
}

const INVOICE_V02: Record<string, unknown> = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id:     'https://etapsky.github.io/sdf/schemas/invoice/v0.2.json',
  title:   'SDF Invoice',
  type:    'object',
  required: ['document_type', 'invoice_number', 'issuer', 'currency'], // 'currency' added as required
  properties: {
    document_type:  { type: 'string', const: 'invoice' },
    invoice_number: { type: 'string', minLength: 1 },
    issuer:         { type: 'object' },
    due_date:       { type: 'string', format: 'date' },
    currency:       { type: 'string', minLength: 3 }, // new required field
    notes:          { type: 'string' },               // new optional field
  },
  additionalProperties: false,
}

// ─── SchemaRegistry tests ─────────────────────────────────────────────────────

describe('SchemaRegistry', () => {
  let registry: SchemaRegistry

  beforeEach(() => {
    registry = new SchemaRegistry({ allowRemote: false })
  })

  it('registers a schema and resolves it by $id', async () => {
    registry.register(INVOICE_V01, {
      documentType: 'invoice', major: 0, minor: 1, version: '0.1',
      publishedAt: '2026-03-01T00:00:00Z', latest: true, deprecated: false,
    })

    const entry = await registry.resolve('https://etapsky.github.io/sdf/schemas/invoice/v0.1.json')
    expect(entry.schema.$id).toBe('https://etapsky.github.io/sdf/schemas/invoice/v0.1.json')
    expect(entry.meta.documentType).toBe('invoice')
    expect(entry.meta.version).toBe('0.1')
  })

  it('resolves latest schema for a document type', () => {
    registry.register(INVOICE_V01, {
      documentType: 'invoice', major: 0, minor: 1, version: '0.1',
      publishedAt: '2026-03-01T00:00:00Z', latest: false, deprecated: false,
    })
    registry.register(INVOICE_V02, {
      documentType: 'invoice', major: 0, minor: 2, version: '0.2',
      publishedAt: '2026-03-15T00:00:00Z', latest: true, deprecated: false,
    })

    const latest = registry.resolveLatest('invoice')
    expect(latest?.meta.version).toBe('0.2')
  })

  it('resolves a specific version', () => {
    registry.register(INVOICE_V01, {
      documentType: 'invoice', major: 0, minor: 1, version: '0.1',
      publishedAt: '2026-03-01T00:00:00Z', latest: false, deprecated: false,
    })
    registry.register(INVOICE_V02, {
      documentType: 'invoice', major: 0, minor: 2, version: '0.2',
      publishedAt: '2026-03-15T00:00:00Z', latest: true, deprecated: false,
    })

    const v01 = registry.resolveVersion('invoice', '0.1')
    expect(v01?.meta.version).toBe('0.1')
  })

  it('lists all schemas', () => {
    registry.register(INVOICE_V01, {
      documentType: 'invoice', major: 0, minor: 1, version: '0.1',
      publishedAt: '2026-03-01T00:00:00Z', latest: false, deprecated: false,
    })
    registry.register(INVOICE_V02, {
      documentType: 'invoice', major: 0, minor: 2, version: '0.2',
      publishedAt: '2026-03-15T00:00:00Z', latest: true, deprecated: false,
    })

    const result = registry.list()
    expect(result.total).toBe(2)
    expect(result.documentTypes).toContain('invoice')
  })

  it('lists versions for a document type', () => {
    registry.register(INVOICE_V01, {
      documentType: 'invoice', major: 0, minor: 1, version: '0.1',
      publishedAt: '2026-03-01T00:00:00Z', latest: false, deprecated: false,
    })
    registry.register(INVOICE_V02, {
      documentType: 'invoice', major: 0, minor: 2, version: '0.2',
      publishedAt: '2026-03-15T00:00:00Z', latest: true, deprecated: false,
    })

    const versions = registry.versions('invoice')
    expect(versions).toHaveLength(2)
    expect(versions[0].version).toBe('0.2') // newest first
  })

  it('validates data against a registered schema', async () => {
    registry.register(INVOICE_V01, {
      documentType: 'invoice', major: 0, minor: 1, version: '0.1',
      publishedAt: '2026-03-01T00:00:00Z', latest: true, deprecated: false,
    })

    const valid = await registry.validate(
      { document_type: 'invoice', invoice_number: 'INV-001', issuer: { name: 'Acme' } },
      'https://etapsky.github.io/sdf/schemas/invoice/v0.1.json',
    )
    expect(valid.valid).toBe(true)
    expect(valid.errors).toHaveLength(0)
  })

  it('returns errors for invalid data', async () => {
    registry.register(INVOICE_V01, {
      documentType: 'invoice', major: 0, minor: 1, version: '0.1',
      publishedAt: '2026-03-01T00:00:00Z', latest: true, deprecated: false,
    })

    const invalid = await registry.validate(
      { document_type: 'invoice' }, // missing required fields
      'https://etapsky.github.io/sdf/schemas/invoice/v0.1.json',
    )
    expect(invalid.valid).toBe(false)
    expect(invalid.errors.length).toBeGreaterThan(0)
  })

  it('throws when schema not found and remote disabled', async () => {
    await expect(
      registry.resolve('https://etapsky.github.io/sdf/schemas/unknown/v0.1.json')
    ).rejects.toThrow('remote fetch is disabled')
  })

  it('builds correct schema $id URI', () => {
    const id = registry.buildSchemaId('invoice', '0.1')
    expect(id).toBe('https://etapsky.github.io/sdf/schemas/invoice/v0.1.json')
  })
})

// ─── diffSchemas tests ────────────────────────────────────────────────────────

describe('diffSchemas', () => {
  it('detects no changes for identical schemas', () => {
    const result = diffSchemas(INVOICE_V01, INVOICE_V01)
    expect(result.changes).toHaveLength(0)
    expect(result.breaking).toBe(false)
  })

  it('detects added optional field as non-breaking', () => {
    const result = diffSchemas(INVOICE_V01, INVOICE_V02)
    const notesChange = result.changes.find(c => c.path === 'properties.notes')
    expect(notesChange).toBeDefined()
    expect(notesChange?.type).toBe('field_added')
    expect(notesChange?.breaking).toBe(false)
  })

  it('detects added required field as breaking', () => {
    const result = diffSchemas(INVOICE_V01, INVOICE_V02)
    const reqChange = result.changes.find(
      c => c.type === 'field_required_added' && c.path.includes('currency')
    )
    expect(reqChange).toBeDefined()
    expect(reqChange?.breaking).toBe(true)
  })

  it('detects removed field as breaking', () => {
    const schemaWithoutDueDate = {
      ...INVOICE_V02,
      properties: { ...INVOICE_V02.properties as object } as Record<string, unknown>,
    }
    delete (schemaWithoutDueDate.properties as Record<string, unknown>).due_date

    const result = diffSchemas(INVOICE_V01, schemaWithoutDueDate)
    const removed = result.changes.find(c => c.type === 'field_removed' && c.path === 'properties.due_date')
    expect(removed).toBeDefined()
    expect(removed?.breaking).toBe(true)
  })

  it('marks overall result as breaking when any change is breaking', () => {
    const result = diffSchemas(INVOICE_V01, INVOICE_V02)
    expect(result.breaking).toBe(true)
    expect(result.summary.breaking).toBeGreaterThan(0)
  })

  it('provides correct summary counts', () => {
    const result = diffSchemas(INVOICE_V01, INVOICE_V02)
    expect(result.summary.total).toBe(result.changes.length)
    expect(result.summary.breaking + result.summary.nonBreaking).toBe(result.summary.total)
  })
})

// ─── MigrationEngine tests ────────────────────────────────────────────────────

describe('MigrationEngine', () => {
  let engine: MigrationEngine

  beforeEach(() => {
    engine = new MigrationEngine()
    engine.addRule({
      path:        'properties.currency',
      description: 'Add default currency EUR when missing',
      transform:   (data) => ({ ...data, currency: (data.currency as string | undefined) ?? 'EUR' }),
    })
  })

  it('builds a migration plan', () => {
    const plan = engine.plan(INVOICE_V01, INVOICE_V02, 'invoice')
    expect(plan.fromVersion).toBe('0.1')
    expect(plan.toVersion).toBe('0.2')
    expect(plan.documentType).toBe('invoice')
    expect(plan.steps.length).toBeGreaterThan(0)
  })

  it('identifies unhandled breaking changes', () => {
    const plan = engine.plan(INVOICE_V01, INVOICE_V02, 'invoice')
    // 'currency' added as required — breaking, no rule = unhandled
    expect(plan.unhandled.length).toBeGreaterThan(0)
    expect(plan.safe).toBe(false)
  })

  it('applies explicit migration rule', () => {
    engine.addRule({
      path:        'required[currency]',
      description: 'Add default currency EUR when missing',
      transform: (data) => ({
        ...data,
        currency: (data.currency as string | undefined) ?? 'EUR',
      }),
    })

    const plan = engine.plan(INVOICE_V01, INVOICE_V02, 'invoice')
    const data = { document_type: 'invoice', invoice_number: 'INV-001', issuer: {} }
    const result = engine.migrate(data, plan)

    expect((result.data as Record<string, unknown>).currency).toBe('EUR')
    expect(result.warnings.length).toBe(0)
  })

  it('auto-handles optional new field without data change', () => {
    const plan = engine.plan(INVOICE_V01, INVOICE_V02, 'invoice')
    const notesStep = plan.steps.find(s => s.change.path === 'properties.notes')
    expect(notesStep?.autoHandle).toBe(true)
  })

  it('migrates data and returns applied steps', () => {
    engine.addRule({
      path:        'required[currency]',
      description: 'Default currency',
      transform:   (data) => ({ ...data, currency: 'EUR' }),
    })

    const plan   = engine.plan(INVOICE_V01, INVOICE_V02, 'invoice')
    const data   = { document_type: 'invoice', invoice_number: 'INV-001', issuer: {} }
    const result = engine.migrate(data, plan)

    expect(result.applied.length).toBeGreaterThan(0)
    expect(result.data.document_type).toBe('invoice')
  })
})