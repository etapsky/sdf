// ─── sdf convert <input> ──────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Converts a JSON data file + schema + PDF into a .sdf archive.
// Usage: sdf convert --data invoice.json --schema invoice.schema.json
//                    --pdf invoice.pdf --issuer "Acme Corp" --out invoice.sdf

import { readFile, writeFile } from 'fs/promises'
import { buildSDF } from '@etapsky/sdf-kit/producer'
import { SDFError } from '@etapsky/sdf-kit'
import { print, blank, success, error, info, clr, header, divider, kv } from '../ui/print.js'

export interface ConvertOptions {
  data:    string;   // path to data.json
  schema:  string;   // path to schema.json
  pdf?:    string;   // path to visual.pdf (optional — auto-generated if absent)
  issuer:  string;
  issuerId?: string;
  documentType?: string;
  recipient?: string;
  recipientId?: string;
  schemaId?: string;
  out:     string;   // output .sdf path
}

export async function convert(opts: ConvertOptions) {
  header()
  print(`  ${clr.dim}convert${clr.reset}  ${clr.cyan}${opts.out}${clr.reset}`)
  divider()

  // ─── Read data.json ────────────────────────────────────────────────────────
  info(`Reading data:    ${opts.data}`)
  let data: Record<string, unknown>
  try {
    const raw = await readFile(opts.data, 'utf-8')
    data = JSON.parse(raw)
  } catch (err) {
    error(`Cannot read data file: ${opts.data}`)
    error(String(err))
    process.exit(1)
  }

  // ─── Read schema.json ──────────────────────────────────────────────────────
  info(`Reading schema:  ${opts.schema}`)
  let schema: Record<string, unknown>
  try {
    const raw = await readFile(opts.schema, 'utf-8')
    schema = JSON.parse(raw)
  } catch (err) {
    error(`Cannot read schema file: ${opts.schema}`)
    error(String(err))
    process.exit(1)
  }

  // ─── Build SDF ────────────────────────────────────────────────────────────
  blank()
  info('Building SDF...')

  let buffer: Uint8Array
  try {
    buffer = await buildSDF({
      data,
      schema,
      issuer:       opts.issuer,
      issuerId:     opts.issuerId,
      documentType: opts.documentType,
      recipient:    opts.recipient,
      recipientId:  opts.recipientId,
      schemaId:     opts.schemaId ?? (schema.$id as string | undefined),
    })
  } catch (err) {
    blank()
    if (err instanceof SDFError) {
      error(`${err.code}`)
      print(`     ${clr.gray}${err.message}${clr.reset}`)
      if (err.details && Array.isArray(err.details)) {
        for (const d of (err.details as Array<Record<string, string>>).slice(0, 5)) {
          info(d.message ?? String(d))
        }
      }
    } else {
      error(String(err))
    }
    blank()
    process.exit(1)
  }

  // ─── Write output ─────────────────────────────────────────────────────────
  try {
    await writeFile(opts.out, buffer)
  } catch (err) {
    error(`Cannot write output: ${opts.out}`)
    error(String(err))
    process.exit(1)
  }

  const kb = (buffer.length / 1024).toFixed(1)

  blank()
  success(`SDF file written`)
  blank()
  kv('output',   opts.out)
  kv('size',     `${kb} KB`)
  kv('issuer',   opts.issuer + (opts.issuerId ? ` (${opts.issuerId})` : ''))
  if (opts.documentType) kv('type', opts.documentType)
  blank()
  divider()
  print(`  ${clr.green}✓${clr.reset}  ${clr.bold}${opts.out}${clr.reset} created successfully`)
  blank()
}