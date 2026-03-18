// ─── SchemaRegistry ───────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Versioned schema store with local lookup, remote fetch, and AJV validation.
// Remote schemas are fetched from DEFAULT_BASE_URL and cached in the local
// store after first retrieval. Schema $id URIs are the canonical keys.

import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type {
  SchemaEntry,
  SchemaVersion,
  RegistryConfig,
  RegistryListResult,
} from './types.js'

const DEFAULT_BASE_URL = 'https://etapsky.github.io/sdf/schemas'
const DEFAULT_CONFIG: RegistryConfig = {
  baseUrl:     DEFAULT_BASE_URL,
  allowRemote: true,
  fetchTimeout: 5000,
}

export class SchemaRegistry {
  private config:  RegistryConfig
  private store:   Map<string, SchemaEntry> = new Map()
  private ajv:     Ajv

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.ajv    = new Ajv({ allErrors: true, strict: false })
    addFormats(this.ajv)
  }

  // ─── Registration ──────────────────────────────────────────────────────────

  /**
   * Register a schema locally.
   * schemaId must match the schema's $id field.
   */
  register(schema: Record<string, unknown>, meta: Omit<SchemaVersion, 'schemaId'>): void {
    const schemaId = schema.$id as string
    if (!schemaId) throw new Error('Schema must have a $id field')

    const entry: SchemaEntry = {
      schema,
      meta: { ...meta, schemaId },
    }

    this.store.set(schemaId, entry)

    // If this is latest, update other versions for same docType
    if (meta.latest) {
      for (const [id, e] of this.store.entries()) {
        if (
          e.meta.documentType === meta.documentType &&
          id !== schemaId
        ) {
          e.meta.latest = false
        }
      }
    }
  }

  /**
   * Register multiple schemas at once.
   */
  registerAll(entries: Array<{ schema: Record<string, unknown>; meta: Omit<SchemaVersion, 'schemaId'> }>): void {
    for (const entry of entries) {
      this.register(entry.schema, entry.meta)
    }
  }

  // ─── Resolution ────────────────────────────────────────────────────────────

  /**
   * Resolve a schema by $id.
   * Checks local store first, then fetches remotely if allowed.
   */
  async resolve(schemaId: string): Promise<SchemaEntry> {
    // Local hit
    const local = this.store.get(schemaId)
    if (local) return local

    // Remote fetch
    if (!this.config.allowRemote) {
      throw new Error(`Schema not found locally and remote fetch is disabled: ${schemaId}`)
    }

    return this.fetchRemote(schemaId)
  }

  /**
   * Resolve the latest schema for a document type.
   */
  resolveLatest(documentType: string): SchemaEntry | undefined {
    for (const entry of this.store.values()) {
      if (entry.meta.documentType === documentType && entry.meta.latest) {
        return entry
      }
    }
    return undefined
  }

  /**
   * Resolve a specific version for a document type.
   */
  resolveVersion(documentType: string, version: string): SchemaEntry | undefined {
    for (const entry of this.store.values()) {
      if (
        entry.meta.documentType === documentType &&
        entry.meta.version === version
      ) {
        return entry
      }
    }
    return undefined
  }

  // ─── Listing ───────────────────────────────────────────────────────────────

  list(documentType?: string): RegistryListResult {
    const schemas = Array.from(this.store.values())
      .map(e => e.meta)
      .filter(m => !documentType || m.documentType === documentType)
      .sort((a, b) => {
        if (a.documentType !== b.documentType) return a.documentType.localeCompare(b.documentType)
        if (a.major !== b.major) return b.major - a.major
        return b.minor - a.minor
      })

    const documentTypes = [...new Set(schemas.map(s => s.documentType))]

    return { documentTypes, schemas, total: schemas.length }
  }

  /**
   * List all versions for a specific document type.
   */
  versions(documentType: string): SchemaVersion[] {
    return Array.from(this.store.values())
      .filter(e => e.meta.documentType === documentType)
      .map(e => e.meta)
      .sort((a, b) => b.major - a.major || b.minor - a.minor)
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  /**
   * Validate data against a schema by $id.
   * Resolves the schema first (local or remote).
   */
  async validate(
    data:     unknown,
    schemaId: string,
  ): Promise<{ valid: boolean; errors: unknown[] }> {
    const entry = await this.resolve(schemaId)
    const ajv   = new Ajv({ allErrors: true, strict: false })
    addFormats(ajv)
  
    // Strip $schema meta-reference — Ajv 8 does not auto-load draft URIs
    const { $schema: _, ...schemaWithoutMeta } = entry.schema as { $schema?: unknown } & Record<string, unknown>
    const validate = ajv.compile(schemaWithoutMeta)
    const valid    = validate(data) as boolean
    return { valid, errors: validate.errors ?? [] }
  }

  // ─── Remote fetch ──────────────────────────────────────────────────────────

  private async fetchRemote(schemaId: string): Promise<SchemaEntry> {
    const controller = new AbortController()
    const timer      = setTimeout(() => controller.abort(), this.config.fetchTimeout)

    let response: Response
    try {
      response = await fetch(schemaId, { signal: controller.signal })
    } catch (err) {
      throw new Error(`Failed to fetch schema ${schemaId}: ${String(err)}`)
    } finally {
      clearTimeout(timer)
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch schema ${schemaId}: HTTP ${response.status}`)
    }

    let schema: Record<string, unknown>
    try {
      schema = await response.json() as Record<string, unknown>
    } catch {
      throw new Error(`Schema at ${schemaId} is not valid JSON`)
    }

    // Parse version from $id URI
    // Expected pattern: .../schemas/{documentType}/v{MAJOR}.{MINOR}.json
    const versionMatch = schemaId.match(/\/schemas\/([^/]+)\/v(\d+)\.(\d+)\.json$/)
    const documentType = versionMatch?.[1] ?? 'unknown'
    const major        = parseInt(versionMatch?.[2] ?? '0', 10)
    const minor        = parseInt(versionMatch?.[3] ?? '0', 10)

    const entry: SchemaEntry = {
      schema,
      meta: {
        documentType,
        major,
        minor,
        version:     `${major}.${minor}`,
        schemaId,
        publishedAt: new Date().toISOString(),
        latest:      false,
        deprecated:  false,
      },
    }

    // Cache locally
    this.store.set(schemaId, entry)
    return entry
  }

  // ─── Utils ─────────────────────────────────────────────────────────────────

  /** Build a canonical schema $id URI */
  buildSchemaId(documentType: string, version: string): string {
    return `${this.config.baseUrl}/${documentType}/v${version}.json`
  }

  /** Check if a schema is registered locally */
  has(schemaId: string): boolean {
    return this.store.has(schemaId)
  }

  /** Remove a schema from local store */
  remove(schemaId: string): boolean {
    return this.store.delete(schemaId)
  }

  /** Clear all locally registered schemas */
  clear(): void {
    this.store.clear()
  }

  get size(): number {
    return this.store.size
  }
}

// ─── Default singleton registry ───────────────────────────────────────────────

export const defaultRegistry = new SchemaRegistry()