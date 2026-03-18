// ─── sdf verify <file.sdf> ────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Verifies the digital signature of a signed SDF archive using a SPKI
// public key (Base64-encoded). Delegates to verifySig() in sdf-kit/signer.
// SDF_FORMAT.md Section 11.3 — Signature Verification.
//
// Exit codes: 0 = signature valid · 1 = invalid or structural error.
// PEM headers are stripped automatically — raw Base64 and armoured PEM
// public key files are both accepted.
// Supports --quiet mode for CI/shell pipelines (no stdout, stderr on error).
import { readFile } from 'fs/promises'
import { verifySig, importSDFPublicKey, type SDFSigningAlgorithm } from '@etapsky/sdf-kit/signer'
import { SDFError } from '@etapsky/sdf-kit'
import { print, blank, success, error, info, kv, clr, header, divider } from '../ui/print.js'

export interface VerifyOptions {
  file:      string;
  keyPath:   string;
  algorithm: SDFSigningAlgorithm;
  quiet:     boolean;
}

export async function verify(opts: VerifyOptions) {
  if (!opts.quiet) {
    header()
    print(`  ${clr.dim}verify${clr.reset}  ${clr.cyan}${opts.file}${clr.reset}`)
    divider()
  }

  let sdfBuffer: Buffer
  try {
    sdfBuffer = await readFile(opts.file)
  } catch {
    if (!opts.quiet) error(`File not found: ${opts.file}`)
    else process.stderr.write(`SDF_ERROR_NOT_FOUND: ${opts.file}\n`)
    process.exit(1)
  }

  let keyRaw: string
  try {
    keyRaw = (await readFile(opts.keyPath, 'utf-8')).trim()
    keyRaw = keyRaw
      .replace(/-----BEGIN (?:EC |RSA )?PUBLIC KEY-----/g, '')
      .replace(/-----END (?:EC |RSA )?PUBLIC KEY-----/g, '')
      .replace(/\s/g, '')
  } catch {
    if (!opts.quiet) error(`Cannot read key file: ${opts.keyPath}`)
    process.exit(1)
  }

  let publicKey: CryptoKey
  try {
    publicKey = await importSDFPublicKey(keyRaw, opts.algorithm)
  } catch (err) {
    if (!opts.quiet) {
      error(`Cannot import public key: ${String(err)}`)
      info('Key must be Base64-encoded SPKI public key')
    }
    process.exit(1)
  }

  let result: Awaited<ReturnType<typeof verifySig>>
  try {
    result = await verifySig(new Uint8Array(sdfBuffer), { publicKey, algorithm: opts.algorithm })
  } catch (err) {
    if (!opts.quiet) {
      blank()
      if (err instanceof SDFError) {
        error(`${err.code}`)
        print(`     ${clr.gray}${err.message}${clr.reset}`)
      } else {
        error(String(err))
      }
      blank()
    } else {
      process.stderr.write(`${err instanceof SDFError ? err.code : 'ERROR'}: ${String(err)}\n`)
    }
    process.exit(1)
  }

  if (!opts.quiet) {
    blank()
    if (result.valid) {
      success(`Signature valid`)
    } else {
      error(`Signature invalid`)
    }
    blank()
    kv('algorithm',  result.algorithm, clr.cyan)
    kv('signed_at',  result.signed_at, clr.yellow)
    kv('digest',     result.content_digest.slice(0, 16) + '…', clr.magenta)
    if (!result.valid && result.reason) {
      blank()
      kv('reason', result.reason, clr.red)
    }
    blank()
    divider()
    if (result.valid) {
      print(`  ${clr.green}✓${clr.reset}  ${clr.bold}${opts.file}${clr.reset} signature verified`)
    } else {
      print(`  ${clr.red}✗${clr.reset}  ${clr.bold}${opts.file}${clr.reset} signature verification FAILED`)
    }
    blank()
  }

  process.exit(result.valid ? 0 : 1)
}