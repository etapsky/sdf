// ─── sdf wrap <file.pdf> ──────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Wraps an existing PDF into a .sdf container.
// The PDF becomes visual.pdf — no structured data is extracted from it.
// data.json will contain a minimal stub indicating the file was wrapped.
// The resulting .sdf is a valid SDF document that any SDF reader can open.
//
// Use case: bring existing PDFs into the SDF ecosystem so they can be
// opened in SDF Reader. The visual layer is intact; structured data
// will show a "plain PDF" notice rather than document fields.

import { readFile, writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import JSZip from 'jszip'
import {
  print, blank, success, error, info, kv, clr, header, divider,
} from '../ui/print.js'

export interface WrapOptions {
  pdf:           string;   // path to input .pdf
  issuer:        string;
  issuerId?:     string;
  documentType?: string;
  recipient?:    string;
  recipientId?:  string;
  out:           string;   // output .sdf path
}

export async function wrap(opts: WrapOptions) {
  header()
  print(`  ${clr.dim}wrap${clr.reset}  ${clr.cyan}${opts.pdf}${clr.reset}  ${clr.gray}→${clr.reset}  ${clr.cyan}${opts.out}${clr.reset}`)
  divider()

  // ─── Read PDF ─────────────────────────────────────────────────────────────
  info(`Reading PDF: ${opts.pdf}`)
  let pdfBytes: Buffer
  try {
    pdfBytes = await readFile(opts.pdf)
  } catch {
    error(`Cannot read PDF file: ${opts.pdf}`)
    process.exit(1)
  }

  const pdfKb = (pdfBytes.length / 1024).toFixed(1)
  info(`PDF size:    ${pdfKb} KB`)

  // ─── Build stub data.json ─────────────────────────────────────────────────
  // Minimal valid JSON — indicates file was wrapped, no structured data
  const data = {
    document_type: opts.documentType ?? 'wrapped_pdf',
    source:        'wrapped_from_pdf',
    original_file: opts.pdf.split('/').pop() ?? opts.pdf,
    note:          'This document was wrapped from a plain PDF. No structured data layer was extracted.',
  }

  // ─── Build stub schema.json ───────────────────────────────────────────────
  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title:   'Wrapped PDF',
    type:    'object',
    properties: {
      document_type: { type: 'string' },
      source:        { type: 'string' },
      original_file: { type: 'string' },
      note:          { type: 'string' },
    },
  }

  // ─── Build meta.json ──────────────────────────────────────────────────────
  const meta: Record<string, unknown> = {
    sdf_version:         '0.1',
    document_id:         randomUUID(),
    issuer:              opts.issuer,
    created_at:          new Date().toISOString(),
    signature_algorithm: null,
  }
  if (opts.issuerId)     meta.issuer_id     = opts.issuerId
  if (opts.documentType) meta.document_type = opts.documentType
  if (opts.recipient)    meta.recipient     = opts.recipient
  if (opts.recipientId)  meta.recipient_id  = opts.recipientId

  // ─── Pack ZIP ─────────────────────────────────────────────────────────────
  blank()
  info('Packing SDF...')

  const zip = new JSZip()
  zip.file('visual.pdf',  pdfBytes,                      { binary: true })
  zip.file('data.json',   JSON.stringify(data,   null, 2))
  zip.file('schema.json', JSON.stringify(schema, null, 2))
  zip.file('meta.json',   JSON.stringify(meta,   null, 2))

  const buffer = await zip.generateAsync({
    type:        'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  // ─── Write output ─────────────────────────────────────────────────────────
  try {
    await writeFile(opts.out, buffer)
  } catch {
    error(`Cannot write output: ${opts.out}`)
    process.exit(1)
  }

  const sdfKb = (buffer.length / 1024).toFixed(1)

  blank()
  success('SDF file written')
  blank()
  kv('output',       opts.out)
  kv('size',         `${sdfKb} KB  (PDF: ${pdfKb} KB)`)
  kv('issuer',       opts.issuer + (opts.issuerId ? ` (${opts.issuerId})` : ''))
  kv('document_id',  meta.document_id as string)
  kv('data layer',   `${clr.yellow}stub only — no structured data extracted${clr.reset}`)
  blank()
  divider()
  print(`  ${clr.green}✓${clr.reset}  ${clr.bold}${opts.out}${clr.reset} created`)
  print(`  ${clr.gray}  Open in SDF Reader to view the PDF. Structured data panel will show a notice.${clr.reset}`)
  blank()
}