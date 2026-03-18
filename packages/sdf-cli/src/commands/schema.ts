// ─── sdf schema <subcommand> ──────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Schema registry operations — list, version history, diff, and validation.
// Delegates to @etapsky/sdf-schema-registry for registry and diff logic.
// schemaDiff: exit 0 = backward-compatible · exit 1 = breaking changes.
// schemaValidate: exit 0 = valid · exit 1 = invalid (CI-friendly).
//
// Subcommands:
//   sdf schema list      [--type <doctype>] [--registry <file>]
//   sdf schema versions  --type <doctype>
//   sdf schema diff      --from <file|url> --to <file|url>
//   sdf schema validate  --data <file> --schema <file>

import { readFile } from 'fs/promises'
import { SchemaRegistry } from '@etapsky/sdf-schema-registry/registry'
import { diffSchemas } from '@etapsky/sdf-schema-registry/diff'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import {
  print, blank, success, error, info, warn, kv,
  clr, header, divider, sectionHeader,
} from '../ui/print.js'

// ─── sdf schema list ──────────────────────────────────────────────────────────

export async function schemaList(opts: { type?: string; registryPath?: string }) {
  header()
  print(`  ${clr.dim}schema list${clr.reset}${opts.type ? `  ${clr.cyan}${opts.type}${clr.reset}` : ''}`)
  divider()

  const registry = await loadRegistry(opts.registryPath)
  const result   = registry.list(opts.type)

  if (result.total === 0) {
    blank()
    warn('No schemas registered in local registry')
    info('Register schemas with: registry.register(schema, meta)')
    blank()
    process.exit(0)
  }

  blank()
  info(`${result.total} schema${result.total > 1 ? 's' : ''} · ${result.documentTypes.length} document type${result.documentTypes.length > 1 ? 's' : ''}`)
  blank()

  let currentType = ''
  for (const schema of result.schemas) {
    if (schema.documentType !== currentType) {
      currentType = schema.documentType
      print(`  ${clr.cyan}${currentType}${clr.reset}`)
    }
    const latestTag    = schema.latest     ? ` ${clr.green}[latest]${clr.reset}`     : ''
    const deprecatedTag = schema.deprecated ? ` ${clr.yellow}[deprecated]${clr.reset}` : ''
    print(`    v${schema.version}${latestTag}${deprecatedTag}`)
    print(`    ${clr.gray}${schema.schemaId}${clr.reset}`)
    if (schema.description) print(`    ${clr.dim}${schema.description}${clr.reset}`)
    blank()
  }

  divider()
  blank()
}

// ─── sdf schema versions ──────────────────────────────────────────────────────

export async function schemaVersions(opts: { type: string; registryPath?: string }) {
  header()
  print(`  ${clr.dim}schema versions${clr.reset}  ${clr.cyan}${opts.type}${clr.reset}`)
  divider()

  const registry = await loadRegistry(opts.registryPath)
  const versions = registry.versions(opts.type)

  if (versions.length === 0) {
    blank()
    warn(`No schemas registered for document type: ${opts.type}`)
    blank()
    process.exit(0)
  }

  blank()
  for (const v of versions) {
    const tags: string[] = []
    if (v.latest)     tags.push(`${clr.green}latest${clr.reset}`)
    if (v.deprecated) tags.push(`${clr.yellow}deprecated${clr.reset}`)

    print(`  ${clr.bold}v${v.version}${clr.reset}  ${tags.join('  ')}`)
    kv('$id',         v.schemaId, clr.dim)
    kv('published',   v.publishedAt, clr.yellow)
    if (v.description) kv('description', v.description)
    if (v.deprecated && v.deprecationMessage) {
      kv('deprecation', v.deprecationMessage, clr.yellow)
    }
    blank()
  }

  divider()
  blank()
}

// ─── sdf schema diff ──────────────────────────────────────────────────────────

export async function schemaDiff(opts: { from: string; to: string }) {
  header()
  print(`  ${clr.dim}schema diff${clr.reset}  ${clr.cyan}${opts.from}${clr.reset}  ${clr.gray}→${clr.reset}  ${clr.cyan}${opts.to}${clr.reset}`)
  divider()

  const oldSchema = await loadSchemaFile(opts.from)
  const newSchema = await loadSchemaFile(opts.to)

  blank()
  info(`Comparing schemas...`)

  const result = diffSchemas(oldSchema, newSchema)

  blank()

  if (result.changes.length === 0) {
    success('No changes detected — schemas are identical')
    blank()
    process.exit(0)
  }

  // Summary
  kv('total changes',   String(result.summary.total))
  kv('breaking',        String(result.summary.breaking),    result.summary.breaking    > 0 ? clr.red    : clr.green)
  kv('non-breaking',    String(result.summary.nonBreaking), result.summary.nonBreaking > 0 ? clr.yellow : clr.green)
  blank()

  if (result.breaking) {
    print(`  ${clr.red}⚠  BREAKING CHANGES DETECTED${clr.reset}`)
    print(`  ${clr.gray}  These changes are not backward-compatible.${clr.reset}`)
    print(`  ${clr.gray}  Existing SDF producers or consumers may fail.${clr.reset}`)
    blank()
  } else {
    print(`  ${clr.green}✓  All changes are backward-compatible${clr.reset}`)
    blank()
  }

  // Breaking changes first
  const breaking    = result.changes.filter(c => c.breaking)
  const nonBreaking = result.changes.filter(c => !c.breaking)

  if (breaking.length > 0) {
    sectionHeader('breaking changes')
    for (const change of breaking) {
      print(`  ${clr.red}✗${clr.reset}  ${clr.white}${change.path}${clr.reset}`)
      print(`     ${clr.gray}${change.message}${clr.reset}`)
      if (change.oldValue !== undefined) print(`     ${clr.dim}was: ${JSON.stringify(change.oldValue)}${clr.reset}`)
      if (change.newValue !== undefined) print(`     ${clr.dim}now: ${JSON.stringify(change.newValue)}${clr.reset}`)
      blank()
    }
  }

  if (nonBreaking.length > 0) {
    sectionHeader('non-breaking changes')
    for (const change of nonBreaking) {
      print(`  ${clr.yellow}·${clr.reset}  ${clr.white}${change.path}${clr.reset}`)
      print(`     ${clr.gray}${change.message}${clr.reset}`)
      blank()
    }
  }

  divider()
  if (result.breaking) {
    print(`  ${clr.red}✗${clr.reset}  ${result.summary.breaking} breaking change${result.summary.breaking > 1 ? 's' : ''} — requires MAJOR version bump`)
  } else {
    print(`  ${clr.green}✓${clr.reset}  Safe for MINOR version bump`)
  }
  blank()

  process.exit(result.breaking ? 1 : 0)
}

// ─── sdf schema validate ──────────────────────────────────────────────────────

export async function schemaValidate(opts: {
  dataPath:   string;
  schemaPath: string;
  quiet:      boolean;
}) {
  if (!opts.quiet) {
    header()
    print(`  ${clr.dim}schema validate${clr.reset}  ${clr.cyan}${opts.dataPath}${clr.reset}`)
    divider()
  }

  let data:   unknown
  let schema: Record<string, unknown>

  try {
    data = JSON.parse(await readFile(opts.dataPath, 'utf-8'))
  } catch {
    if (!opts.quiet) error(`Cannot read data file: ${opts.dataPath}`)
    process.exit(1)
  }

  try {
    schema = JSON.parse(await readFile(opts.schemaPath, 'utf-8'))
  } catch {
    if (!opts.quiet) error(`Cannot read schema file: ${opts.schemaPath}`)
    process.exit(1)
  }

  const ajv = new Ajv({ allErrors: true, strict: false })
  addFormats(ajv)
  const { $schema: _, ...schemaWithoutMeta } = schema as { $schema?: unknown } & Record<string, unknown>
  const validateFn = ajv.compile(schemaWithoutMeta)
  const valid      = validateFn(data) as boolean
  const errors     = validateFn.errors ?? []

  if (!opts.quiet) {
    blank()
    if (valid) {
      success(`data.json is valid against schema`)
    } else {
      error(`Validation failed — ${errors.length} error${errors.length > 1 ? 's' : ''}`)
      blank()
      for (const err of errors.slice(0, 10)) {
        const e = err as unknown as Record<string, unknown>
        print(`  ${clr.red}·${clr.reset}  ${clr.white}${e.instancePath || '/'}${clr.reset}  ${clr.gray}${e.message}${clr.reset}`)
      }
    }
    blank()
    divider()
    if (valid) {
      print(`  ${clr.green}✓${clr.reset}  ${clr.bold}${opts.dataPath}${clr.reset} passed schema validation`)
    } else {
      print(`  ${clr.red}✗${clr.reset}  ${clr.bold}${opts.dataPath}${clr.reset} failed schema validation`)
    }
    blank()
  } else if (!valid) {
    for (const err of errors) {
      const e = err as unknown as Record<string, unknown>
      process.stderr.write(`${e.instancePath || '/'}: ${e.message}\n`)
    }
  }

  process.exit(valid ? 0 : 1)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadSchemaFile(pathOrId: string): Promise<Record<string, unknown>> {
  // If it starts with http, it's a remote $id — try to fetch
  if (pathOrId.startsWith('http')) {
    try {
      const res = await fetch(pathOrId)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json() as Record<string, unknown>
    } catch (err) {
      error(`Cannot fetch schema: ${pathOrId} — ${String(err)}`)
      process.exit(1)
    }
  }

  // Local file
  try {
    return JSON.parse(await readFile(pathOrId, 'utf-8'))
  } catch {
    error(`Cannot read schema file: ${pathOrId}`)
    process.exit(1)
  }
}

async function loadRegistry(registryPath?: string): Promise<SchemaRegistry> {
  const registry = new SchemaRegistry({ allowRemote: false })

  if (!registryPath) return registry

  // Load a registry definition file — JSON array of { schema, meta } entries
  try {
    const raw     = JSON.parse(await readFile(registryPath, 'utf-8')) as Array<{
      schema: Record<string, unknown>;
      meta:   Parameters<SchemaRegistry['register']>[1];
    }>
    registry.registerAll(raw)
  } catch {
    warn(`Could not load registry file: ${registryPath}`)
  }

  return registry
}