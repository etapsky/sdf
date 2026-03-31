// ─── SDF Signer ───────────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Key generation, import/export, and detached signing for SDF archives.
// SDF_FORMAT.md Section 11 — Digital Signatures.
//
// Canonical signed content: data.json + schema.json + meta.json (+ visual.pdf
// if includePDF is set). Signature stored as signature.sig inside the ZIP.
//
// signature.sig schema (JSON):
//   algorithm, signed_at, content_digest, include_pdf, signature, meta_snapshot
//   signer_info — optional identity block (SDFSignerInfo)
//
// Signature encoding for ECDSA (signer_info.signature_encoding):
//   "p1363"  — IEEE P1363 r||s (Web Crypto output — this file)
//   "der"    — ASN.1 DER SEQUENCE{r,s} (OS native — set by Rust signer)
import JSZip from 'jszip'
import { SDFError, SDF_ERRORS } from '../core/errors.js'
import type { SDFSignOptions, SDFSignatureResult, SDFSignerInfo } from './types.js'

// ─── Key Management ───────────────────────────────────────────────────────────

export async function generateSDFKeyPair(
  algorithm: 'RSASSA-PKCS1-v1_5' | 'ECDSA' = 'ECDSA'
): Promise<CryptoKeyPair> {
  if (algorithm === 'ECDSA') {
    return globalThis.crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'],
    )
  }
  return globalThis.crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify'],
  )
}

export async function exportSDFPublicKey(publicKey: CryptoKey): Promise<string> {
  const raw = await globalThis.crypto.subtle.exportKey('spki', publicKey)
  return bufferToBase64(raw)
}

export async function exportSDFPrivateKey(privateKey: CryptoKey): Promise<string> {
  const raw = await globalThis.crypto.subtle.exportKey('pkcs8', privateKey)
  return bufferToBase64(raw)
}

export async function importSDFPublicKey(
  base64Spki: string,
  algorithm: 'RSASSA-PKCS1-v1_5' | 'ECDSA' = 'ECDSA',
): Promise<CryptoKey> {
  const raw = base64ToBuffer(base64Spki)
  const algoParams = algorithm === 'ECDSA'
    ? { name: 'ECDSA', namedCurve: 'P-256' }
    : { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }
  return globalThis.crypto.subtle.importKey('spki', raw.buffer as ArrayBuffer, algoParams, true, ['verify'])
}

export async function importSDFPrivateKey(
  base64Pkcs8: string,
  algorithm: 'RSASSA-PKCS1-v1_5' | 'ECDSA' = 'ECDSA',
): Promise<CryptoKey> {
  const raw = base64ToBuffer(base64Pkcs8)
  const algoParams = algorithm === 'ECDSA'
    ? { name: 'ECDSA', namedCurve: 'P-256' }
    : { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }
  return globalThis.crypto.subtle.importKey('pkcs8', raw.buffer as ArrayBuffer, algoParams, true, ['sign'])
}

// ─── signSDF ──────────────────────────────────────────────────────────────────
// Produces a detached P1363-encoded (Web Crypto) ECDSA or RSASSA-PKCS1-v1_5
// signature over canonical content and embeds it as signature.sig in the ZIP.
// meta.json is updated with signature_algorithm and signed_at AFTER the
// canonical bytes are hashed; the original meta bytes are snapshotted inside
// signature.sig so that verify.ts can deterministically reconstruct them.

export async function signSDF(
  buffer: Uint8Array,
  options: SDFSignOptions,
): Promise<{ buffer: Uint8Array; result: SDFSignatureResult }> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch {
    throw new SDFError(SDF_ERRORS.NOT_ZIP, `${SDF_ERRORS.NOT_ZIP}: Cannot open archive for signing`)
  }

  const dataRaw   = await zip.file('data.json')?.async('uint8array')
  const schemaRaw = await zip.file('schema.json')?.async('uint8array')
  const metaRaw   = await zip.file('meta.json')?.async('string')
  const pdfRaw    = options.includePDF ? await zip.file('visual.pdf')?.async('uint8array') : undefined

  if (!dataRaw || !schemaRaw || !metaRaw) {
    throw new SDFError(SDF_ERRORS.MISSING_FILE, `${SDF_ERRORS.MISSING_FILE}: Required files missing`)
  }

  // Canonical content uses original meta.json — before signature_algorithm update.
  // meta_snapshot is stored in signature.sig so verify.ts can reconstruct the
  // exact same canonical bytes deterministically.
  const canonical = buildCanonicalContent(dataRaw, schemaRaw, metaRaw, pdfRaw)

  const digestBuffer  = await globalThis.crypto.subtle.digest('SHA-256', canonical.buffer as ArrayBuffer)
  const contentDigest = bufferToHex(digestBuffer)

  const algoParams = options.algorithm === 'ECDSA'
    ? { name: 'ECDSA', hash: 'SHA-256' }
    : { name: 'RSASSA-PKCS1-v1_5' }

  let sigBuffer: ArrayBuffer
  try {
    sigBuffer = await globalThis.crypto.subtle.sign(algoParams, options.privateKey, canonical.buffer as ArrayBuffer)
  } catch (err) {
    throw new SDFError(SDF_ERRORS.MISSING_FILE, `Signing failed: ${String(err)}`)
  }

  const signedAt  = new Date().toISOString()
  const signature = bufferToBase64(sigBuffer)

  // Build signer_info — merge caller-supplied fields with self_signed defaults.
  const signerInfo: SDFSignerInfo = {
    mode: 'self_signed',
    signature_encoding: 'p1363',
    ...(options.signerInfo ?? {}),
  }

  const sigPayload = JSON.stringify({
    algorithm:      options.algorithm,
    signed_at:      signedAt,
    content_digest: contentDigest,
    include_pdf:    options.includePDF ?? false,
    signature,
    meta_snapshot:  metaRaw,
    signer_info:    signerInfo,
  }, null, 2)

  // Update meta.json with signature info AFTER signing
  const meta = JSON.parse(metaRaw) as Record<string, unknown>
  meta.signature_algorithm = options.algorithm
  meta.signed_at = signedAt

  zip.file('signature.sig', sigPayload)
  zip.file('meta.json', JSON.stringify(meta, null, 2))

  const outBuffer = await zip.generateAsync({
    type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 },
  })

  return {
    buffer: outBuffer,
    result: {
      signature,
      algorithm:      options.algorithm,
      signed_at:      signedAt,
      content_digest: contentDigest,
      signer_info:    signerInfo,
    },
  }
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────
// buildCanonicalContent — deterministic serialisation of signed sections.
// Each section is length-prefixed (4-byte big-endian uint32) before its bytes,
// guaranteeing unambiguous boundaries regardless of section content.

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

function bufferToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
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
