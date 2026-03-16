// ─── sdf validate <file> ──────────────────────────────────────────────────────
// Fast validation — checks structure, meta, schema, data.
// No output on success (exit 0). Errors to stderr (exit 1).
// Machine-friendly: pipe into CI scripts.

import { readFile } from 'fs/promises'
import { parseSDF } from '@etapsky/sdf-kit/reader'
import { SDFError } from '@etapsky/sdf-kit'
import { print, blank, success, error, info, clr, header, divider } from '../ui/print.js'

export async function validate(filePath: string, opts: { quiet?: boolean } = {}) {
  if (!opts.quiet) {
    header()
    print(`  ${clr.dim}validate${clr.reset}  ${clr.cyan}${filePath}${clr.reset}`)
    divider()
  }

  let buffer: Buffer
  try {
    buffer = await readFile(filePath)
  } catch {
    if (!opts.quiet) error(`File not found: ${filePath}`)
    else process.stderr.write(`SDF_ERROR_NOT_FOUND: ${filePath}\n`)
    process.exit(1)
  }

  try {
    await parseSDF(buffer)
  } catch (err) {
    if (err instanceof SDFError) {
      if (!opts.quiet) {
        blank()
        error(`${err.code}`)
        print(`     ${clr.gray}${err.message}${clr.reset}`)
        if (err.details && Array.isArray(err.details)) {
          for (const detail of err.details.slice(0, 5)) {
            info((detail as Record<string, string>).message ?? String(detail))
          }
        }
        if (err.file) info(`File: ${err.file}`)
        blank()
      } else {
        process.stderr.write(`${err.code}: ${err.message}\n`)
      }
    } else {
      process.stderr.write(`UNKNOWN_ERROR: ${String(err)}\n`)
    }
    process.exit(1)
  }

  if (!opts.quiet) {
    blank()
    success(`Archive structure   valid`)
    success(`meta.json           valid`)
    success(`schema.json         valid JSON Schema`)
    success(`data.json           valid against schema`)
    blank()
    divider()
    print(`  ${clr.green}✓${clr.reset}  ${clr.bold}${filePath}${clr.reset} passed all checks`)
    blank()
  }

  // Exit 0 — valid
  process.exit(0)
}