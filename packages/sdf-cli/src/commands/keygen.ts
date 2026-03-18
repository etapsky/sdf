// ─── sdf keygen ───────────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Generates an SDF signing key pair and writes both halves to disk.
// Keys are exported as raw Base64 (SPKI for public, PKCS#8 for private).
// SDF_FORMAT.md Section 11.1 — Key Management.
//
// Usage:
//   sdf keygen --algorithm ECDSA --out mykey
//   → writes mykey.private.b64  (keep secret — never commit)
//   → writes mykey.public.b64   (distribute for verification)
import { writeFile } from 'fs/promises'
import {
  generateSDFKeyPair,
  exportSDFPublicKey,
  exportSDFPrivateKey,
  type SDFSigningAlgorithm,
} from '@etapsky/sdf-kit/signer'
import { print, blank, success, info, kv, clr, header, divider } from '../ui/print.js'

export interface KeygenOptions {
  algorithm: SDFSigningAlgorithm;
  out:       string; // base path — writes <out>.private.b64 and <out>.public.b64
}

export async function keygen(opts: KeygenOptions) {
  header()
  print(`  ${clr.dim}keygen${clr.reset}  ${clr.cyan}${opts.algorithm}${clr.reset}`)
  divider()

  info(`Generating ${opts.algorithm} key pair...`)

  const keyPair = await generateSDFKeyPair(opts.algorithm)

  const privatePath = `${opts.out}.private.b64`
  const publicPath  = `${opts.out}.public.b64`

  const privateB64 = await exportSDFPrivateKey(keyPair.privateKey)
  const publicB64  = await exportSDFPublicKey(keyPair.publicKey)

  await writeFile(privatePath, privateB64, 'utf-8')
  await writeFile(publicPath,  publicB64,  'utf-8')

  blank()
  success('Key pair generated')
  blank()
  kv('algorithm',   opts.algorithm, clr.cyan)
  kv('private key', privatePath,    clr.red)
  kv('public key',  publicPath,     clr.green)
  blank()

  print(`  ${clr.yellow}⚠${clr.reset}  Keep ${clr.bold}${privatePath}${clr.reset} secret — never share or commit it`)
  print(`  ${clr.gray}  Distribute ${clr.white}${publicPath}${clr.reset}${clr.gray} to recipients for signature verification${clr.reset}`)
  blank()
  divider()
  print(`  ${clr.green}✓${clr.reset}  Key pair written`)
  blank()
}