// ─── sdf sign <file.sdf> ──────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Signs an SDF archive with a PKCS#8 private key (Base64-encoded).
// Delegates to signSDF() in @etapsky/sdf-kit/signer; result is written to
// a new .sdf file that includes signature.sig alongside the updated meta.json.
// SDF_FORMAT.md Section 11 — Digital Signatures.
//
// PEM headers are stripped automatically if present, so both raw Base64
// and armoured PEM private key files are accepted.
import { readFile, writeFile } from 'fs/promises'
import { signSDF, importSDFPrivateKey, type SDFSigningAlgorithm } from '@etapsky/sdf-kit/signer'
import { SDFError } from '@etapsky/sdf-kit'
import { print, blank, success, error, info, kv, warn, clr, header, divider } from '../ui/print.js'

export interface SignOptions {
  file:       string;
  keyPath:    string;
  algorithm:  SDFSigningAlgorithm;
  includePDF: boolean;
  out:        string;
}

export async function sign(opts: SignOptions) {
  header()
  print(`  ${clr.dim}sign${clr.reset}  ${clr.cyan}${opts.file}${clr.reset}`)
  divider()

  info(`Reading SDF:     ${opts.file}`)
  let sdfBuffer: Buffer
  try {
    sdfBuffer = await readFile(opts.file)
  } catch {
    error(`File not found: ${opts.file}`)
    process.exit(1)
  }

  info(`Reading key:     ${opts.keyPath}`)
  let keyRaw: string
  try {
    keyRaw = (await readFile(opts.keyPath, 'utf-8')).trim()
    // Strip PEM headers if present
    keyRaw = keyRaw
      .replace(/-----BEGIN (?:EC |RSA )?PRIVATE KEY-----/g, '')
      .replace(/-----END (?:EC |RSA )?PRIVATE KEY-----/g, '')
      .replace(/\s/g, '')
  } catch {
    error(`Cannot read key file: ${opts.keyPath}`)
    process.exit(1)
  }

  let privateKey: CryptoKey
  try {
    privateKey = await importSDFPrivateKey(keyRaw, opts.algorithm)
  } catch (err) {
    error(`Cannot import private key: ${String(err)}`)
    info(`Key must be Base64-encoded PKCS#8. Generate with: sdf keygen --algorithm ${opts.algorithm} --out mykey`)
    process.exit(1)
  }

  blank()
  info('Signing...')

  let result: Awaited<ReturnType<typeof signSDF>>
  try {
    result = await signSDF(
      new Uint8Array(sdfBuffer),
      { privateKey, algorithm: opts.algorithm, includePDF: opts.includePDF },
    )
  } catch (err) {
    blank()
    if (err instanceof SDFError) {
      error(`${err.code}`)
      print(`     ${clr.gray}${err.message}${clr.reset}`)
    } else {
      error(String(err))
    }
    blank()
    process.exit(1)
  }

  try {
    await writeFile(opts.out, result.buffer)
  } catch {
    error(`Cannot write output: ${opts.out}`)
    process.exit(1)
  }

  const kb = (result.buffer.length / 1024).toFixed(1)

  blank()
  success('SDF file signed')
  blank()
  kv('output',    opts.out)
  kv('size',      `${kb} KB`)
  kv('algorithm', result.result.algorithm, clr.cyan)
  kv('signed_at', result.result.signed_at, clr.yellow)
  kv('digest',    result.result.content_digest.slice(0, 16) + '…', clr.magenta)
  kv('scope',     opts.includePDF
    ? 'data.json + schema.json + meta.json + visual.pdf'
    : 'data.json + schema.json + meta.json', clr.gray)
  blank()
  if (opts.includePDF) {
    warn('visual.pdf is included in signed content — replacing it will invalidate the signature')
  }
  divider()
  print(`  ${clr.green}✓${clr.reset}  ${clr.bold}${opts.out}${clr.reset} signed with ${opts.algorithm}`)
  blank()
}