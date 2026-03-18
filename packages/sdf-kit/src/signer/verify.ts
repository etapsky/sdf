// ─── SDF Verifier ─────────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Signature verification for signed SDF archives.
// SDF_FORMAT.md Section 11.3 — Signature Verification.
// Reads signature.sig from the archive, reconstructs canonical content using
// the embedded meta_snapshot, and verifies the cryptographic signature via
// the Web Crypto API.
import JSZip from 'jszip'
import { SDFError, SDF_ERRORS } from '../core/errors.js'
import type { SDFVerifyOptions, SDFVerifyResult } from './types.js'

// ─── Internal Types ───────────────────────────────────────────────────────────

interface SigPayload {
  algorithm:      string;
  signed_at:      string;
  content_digest: string;
  include_pdf:    boolean;
  signature:      string;
  meta_snapshot?: string; // original meta.json at signing time
}

// ─── verifySig ────────────────────────────────────────────────────────────────
// Returns SDFVerifyResult — never throws on a bad signature, only on a
// structurally broken archive (missing files, invalid ZIP, absent sig file).

export async function verifySig(
  buffer: Uint8Array,
  options: SDFVerifyOptions,
): Promise<SDFVerifyResult> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch {
    throw new SDFError(SDF_ERRORS.NOT_ZIP, `${SDF_ERRORS.NOT_ZIP}: Cannot open archive for verification`)
  }

  const sigRaw = await zip.file('signature.sig')?.async('string')
  if (!sigRaw) {
    throw new SDFError(
      SDF_ERRORS.INVALID_SIGNATURE,
      `${SDF_ERRORS.INVALID_SIGNATURE}: signature.sig is absent — file is not signed`,
    )
  }

  let payload: SigPayload
  try {
    payload = JSON.parse(sigRaw) as SigPayload
  } catch {
    throw new SDFError(SDF_ERRORS.INVALID_SIGNATURE, `${SDF_ERRORS.INVALID_SIGNATURE}: signature.sig is not valid JSON`)
  }

  const { algorithm, signed_at, content_digest, include_pdf, signature, meta_snapshot } = payload

  const dataRaw   = await zip.file('data.json')?.async('uint8array')
  const schemaRaw = await zip.file('schema.json')?.async('uint8array')
  const pdfRaw    = include_pdf ? await zip.file('visual.pdf')?.async('uint8array') : undefined

  if (!dataRaw || !schemaRaw) {
    throw new SDFError(SDF_ERRORS.MISSING_FILE, `${SDF_ERRORS.MISSING_FILE}: Required files missing`)
  }

  // Use meta_snapshot if present — this is the exact meta used during signing.
  // Falls back to current meta.json for backward compatibility.
  const metaForCanonical = meta_snapshot ?? (await zip.file('meta.json')?.async('string') ?? '')
  if (!metaForCanonical) {
    throw new SDFError(SDF_ERRORS.MISSING_FILE, `${SDF_ERRORS.MISSING_FILE}: meta.json missing`)
  }

  const canonical    = buildCanonicalContent(dataRaw, schemaRaw, metaForCanonical, pdfRaw)
  const digestBuffer = await globalThis.crypto.subtle.digest('SHA-256', canonical.buffer as ArrayBuffer)
  const actualDigest = bufferToHex(digestBuffer)

  if (actualDigest !== content_digest) {
    return {
      valid:          false,
      algorithm:      algorithm as SDFVerifyOptions['algorithm'],
      signed_at,
      content_digest: actualDigest,
      reason:         'Content digest mismatch — archive may have been tampered with',
    }
  }

  const sigBytes   = base64ToBuffer(signature)
  const algoParams = options.algorithm === 'ECDSA'
    ? { name: 'ECDSA', hash: 'SHA-256' }
    : { name: 'RSASSA-PKCS1-v1_5' }

  let valid: boolean
  try {
    valid = await globalThis.crypto.subtle.verify(
      algoParams,
      options.publicKey,
      sigBytes.buffer as ArrayBuffer,
      canonical.buffer as ArrayBuffer,
    )
  } catch (err) {
    return {
      valid:          false,
      algorithm:      algorithm as SDFVerifyOptions['algorithm'],
      signed_at,
      content_digest: actualDigest,
      reason:         `Verification error: ${String(err)}`,
    }
  }

  return {
    valid,
    algorithm:      algorithm as SDFVerifyOptions['algorithm'],
    signed_at,
    content_digest: actualDigest,
    reason:         valid ? undefined : 'Signature verification failed — key mismatch or tampered data',
  }
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────
// Must remain byte-for-byte identical to the implementation in sign.ts.

function buildCanonicalContent(
  data: Uint8Array, schema: Uint8Array, meta: string, pdf?: Uint8Array,
): Uint8Array<ArrayBuffer> {
  const metaBytes = new TextEncoder().encode(meta)
  const sections: Uint8Array[] = [data, schema, metaBytes, ...(pdf ? [pdf] : [])]
  let totalLength = 0
  for (const s of sections) totalLength += 4 + s.length
  const out = new Uint8Array(new ArrayBuffer(totalLength))
  let offset = 0
  for (const section of sections) {
    const view = new DataView(out.buffer)
    view.setUint32(offset, section.length, false)
    offset += 4
    out.set(section, offset)
    offset += section.length
  }
  return out as Uint8Array<ArrayBuffer>
}

function base64ToBuffer(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes as Uint8Array<ArrayBuffer>
}

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}