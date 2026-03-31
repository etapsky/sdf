// ─── SDF Verifier ─────────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Signature verification for signed SDF archives.
// SDF_FORMAT.md Section 11.3 — Signature Verification.
//
// Reads signature.sig from the archive, reconstructs canonical content using
// the embedded meta_snapshot, and verifies the cryptographic signature via
// the Web Crypto API.
//
// Supports both signature encodings written by the two signing paths:
//   "p1363" — IEEE P1363 r||s (Web Crypto / this file) — verified directly
//   "der"   — ASN.1 DER SEQUENCE{r,s} (OS native / Rust signer)
//             → converted to P1363 before Web Crypto verify
import JSZip from 'jszip'
import { SDFError, SDF_ERRORS } from '../core/errors.js'
import type { SDFVerifyOptions, SDFVerifyResult, SDFSignerInfo } from './types.js'

// ─── Internal Types ───────────────────────────────────────────────────────────

interface SigPayload {
  algorithm:       string;
  signed_at:       string;
  content_digest:  string;
  include_pdf:     boolean;
  signature:       string;
  meta_snapshot?:  string;
  signer_info?:    SDFSignerInfo;
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

  const { algorithm, signed_at, content_digest, include_pdf, signature, meta_snapshot, signer_info } = payload

  const dataRaw   = await zip.file('data.json')?.async('uint8array')
  const schemaRaw = await zip.file('schema.json')?.async('uint8array')
  const pdfRaw    = include_pdf ? await zip.file('visual.pdf')?.async('uint8array') : undefined

  if (!dataRaw || !schemaRaw) {
    throw new SDFError(SDF_ERRORS.MISSING_FILE, `${SDF_ERRORS.MISSING_FILE}: Required files missing`)
  }

  // Use meta_snapshot if present — exact meta bytes used during signing.
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
      signer_info,
    }
  }

  // Determine encoding — default to "p1363" for pre-Faz3 files without signer_info.
  const encoding = signer_info?.signature_encoding ?? 'p1363'
  let sigBytes: Uint8Array<ArrayBuffer>
  try {
    const rawBytes = base64ToBuffer(signature)
    sigBytes = encoding === 'der'
      ? derEcdsaToP1363(rawBytes)   // convert DER → P1363 for Web Crypto
      : rawBytes
  } catch (err) {
    return {
      valid:          false,
      algorithm:      algorithm as SDFVerifyOptions['algorithm'],
      signed_at,
      content_digest: actualDigest,
      reason:         `Signature decode error: ${String(err)}`,
      signer_info,
    }
  }

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
      signer_info,
    }
  }

  return {
    valid,
    algorithm:      algorithm as SDFVerifyOptions['algorithm'],
    signed_at,
    content_digest: actualDigest,
    reason:         valid ? undefined : 'Signature verification failed — key mismatch or tampered data',
    signer_info,
  }
}

// ─── DER → P1363 conversion ───────────────────────────────────────────────────
// macOS SecKey and Windows NCrypt output DER-encoded ECDSA signatures.
// Web Crypto expects P1363 (raw r||s, each padded to curve byte size = 32 for P-256).

function derEcdsaToP1363(der: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  // DER structure: SEQUENCE { INTEGER r, INTEGER s }
  // 0x30 <seq-len> 0x02 <r-len> <r-bytes> 0x02 <s-len> <s-bytes>
  let off = 0
  if (der[off++] !== 0x30) throw new Error('Expected SEQUENCE tag 0x30')
  // Skip sequence length (1 or 2 bytes)
  if (der[off] & 0x80) off += (der[off] & 0x7f) + 1; else off++
  if (der[off++] !== 0x02) throw new Error('Expected INTEGER tag 0x02 for r')
  const rLen = der[off++]
  // Trim leading 0x00 padding that DER may add to keep value positive
  const rStart = off + (der[off] === 0x00 ? 1 : 0)
  const rEnd   = off + rLen
  const rBytes = der.slice(rStart, rEnd)
  off = rEnd
  if (der[off++] !== 0x02) throw new Error('Expected INTEGER tag 0x02 for s')
  const sLen = der[off++]
  const sStart = off + (der[off] === 0x00 ? 1 : 0)
  const sEnd   = off + sLen
  const sBytes = der.slice(sStart, sEnd)

  // P-256 curve size = 32 bytes; pad r and s to 32 bytes each
  const N = 32
  const out = new Uint8Array(new ArrayBuffer(N * 2))
  out.set(rBytes, N - rBytes.length)
  out.set(sBytes, N * 2 - sBytes.length)
  return out as Uint8Array<ArrayBuffer>
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
