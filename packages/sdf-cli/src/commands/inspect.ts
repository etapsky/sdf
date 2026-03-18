// ─── sdf inspect <file> ───────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Full inspection report: meta, schema summary, data tree, layer sizes.

import { readFile } from 'fs/promises'
import { parseSDF } from '@etapsky/sdf-kit/reader'
import { SDFError } from '@etapsky/sdf-kit'
import {
  print, blank, divider, sectionHeader, kv, success, error, info,
  badge, clr, header,
} from '../ui/print.js'

export async function inspect(filePath: string) {
  header()
  print(`  ${clr.dim}inspect${clr.reset}  ${clr.cyan}${filePath}${clr.reset}`)
  divider()

  // Read file
  let buffer: Buffer
  try {
    buffer = await readFile(filePath)
  } catch {
    error(`File not found: ${filePath}`)
    process.exit(1)
  }

  const kb = (buffer.length / 1024).toFixed(1)
  info(`File size: ${kb} KB`)

  // Parse
  let result: Awaited<ReturnType<typeof parseSDF>>
  try {
    result = await parseSDF(buffer)
  } catch (err) {
    blank()
    if (err instanceof SDFError) {
      error(`${err.code}`)
      print(`     ${clr.gray}${err.message}${clr.reset}`)
      if (err.file) info(`File: ${err.file}`)
    } else {
      error(String(err))
    }
    blank()
    process.exit(1)
  }

  const { meta, data, schema, pdfBytes } = result

  // Validation summary
  blank()
  success(`Archive structure   valid`)
  success(`meta.json           valid`)
  success(`schema.json         valid JSON Schema`)
  success(`data.json           valid against schema`)
  success(`visual.pdf          present (${(pdfBytes.length / 1024).toFixed(1)} KB)`)

  // ─── Meta ───────────────────────────────────────────────────────────────────
  sectionHeader('meta.json')

  kv('sdf_version',   meta.sdf_version,  clr.cyan)
  kv('document_id',   meta.document_id,  clr.magenta)
  kv('issuer',        meta.issuer + (meta.issuer_id ? ` (${meta.issuer_id})` : ''))
  if (meta.recipient) {
    kv('recipient',   meta.recipient + (meta.recipient_id ? ` (${meta.recipient_id})` : ''))
  }
  kv('created_at',    meta.created_at,   clr.yellow)
  if (meta.document_type)    kv('document_type',    meta.document_type,    clr.green)
  if (meta.document_version) kv('document_version', meta.document_version)
  if (meta.schema_id)        kv('schema_id',        meta.schema_id,        clr.dim)
  if (meta.expires_at)       kv('expires_at',       meta.expires_at,       clr.yellow)
  if (meta.tags?.length)     kv('tags',             meta.tags.join(', '))

  const sigStatus = meta.signature_algorithm
    ? badge(meta.signature_algorithm, clr.green)
    : badge('none — Phase 4', clr.gray)
  kv('signature',     sigStatus)

  // ─── Schema ─────────────────────────────────────────────────────────────────
  sectionHeader('schema.json')

  const schemaTitle = (schema as Record<string, unknown>).title as string | undefined
  const schemaId    = (schema as Record<string, unknown>).$id    as string | undefined
  const required    = ((schema as Record<string, unknown>).required as string[] | undefined) ?? []
  const properties  = (schema as Record<string, unknown>).properties as Record<string, unknown> | undefined

  if (schemaTitle) kv('title',      schemaTitle)
  if (schemaId)    kv('$id',        schemaId,    clr.dim)
  kv('required',   `[${required.join(', ')}]`,  clr.yellow)
  kv('properties', `${Object.keys(properties ?? {}).length} fields defined`)

  // ─── Data ───────────────────────────────────────────────────────────────────
  sectionHeader('data.json')
  printObject(data, '  ', 0)

  // ─── Footer ─────────────────────────────────────────────────────────────────
  blank()
  divider()
  print(
    `  ${clr.green}✓${clr.reset}  ` +
    `${clr.bold}${filePath}${clr.reset} ` +
    `is a valid SDF ${meta.sdf_version} document`
  )
  blank()
}

// ─── Recursive object printer ─────────────────────────────────────────────────

function printObject(
  obj:    Record<string, unknown>,
  prefix: string,
  depth:  number,
): void {
  if (depth > 4) return

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue

    if (Array.isArray(value)) {
      print(`${prefix}${clr.cyan}${key}${clr.reset}${clr.gray} [${value.length}]${clr.reset}`)
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        printObject(value[0] as Record<string, unknown>, prefix + '  ', depth + 1)
        if (value.length > 1) {
          print(`${prefix}  ${clr.gray}… +${value.length - 1} more${clr.reset}`)
        }
      }
    } else if (typeof value === 'object') {
      // Monetary amount — render inline
      const obj2 = value as Record<string, unknown>
      if (typeof obj2.amount === 'string' && typeof obj2.currency === 'string') {
        print(`${prefix}${clr.cyan}${key.padEnd(22 - prefix.length + 2)}${clr.reset}${clr.green}${obj2.amount} ${obj2.currency}${clr.reset}`)
      } else {
        print(`${prefix}${clr.cyan}${key}${clr.reset}`)
        printObject(obj2, prefix + '  ', depth + 1)
      }
    } else {
      const display = colorValue(String(value))
      const pad = Math.max(0, 24 - prefix.length - key.length)
      print(`${prefix}${clr.cyan}${key}${clr.reset}${' '.repeat(pad)}${display}`)
    }
  }
}

function colorValue(val: string): string {
  // UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
    return `${clr.magenta}${val}${clr.reset}`
  }
  // ISO date
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
    return `${clr.yellow}${val}${clr.reset}`
  }
  // Number string
  if (/^\d+(\.\d+)?$/.test(val)) {
    return `${clr.green}${val}${clr.reset}`
  }
  return `${clr.white}${val}${clr.reset}`
}