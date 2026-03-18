// ─── Signer Tests ─────────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Tests for signSDF(), verifySig(), key generation and import/export.
// Covers ECDSA (P-256) and RSA-PKCS1-v1_5 algorithms, tamper detection,
// round-trip key serialisation, and error conditions.
// Uses Web Crypto API — Node.js 20+ required.

import { describe, it, expect, beforeAll } from 'vitest'
import { buildSDF } from '../src/producer/index.js'
import {
  generateSDFKeyPair,
  exportSDFPublicKey,
  exportSDFPrivateKey,
  importSDFPublicKey,
  importSDFPrivateKey,
  signSDF,
  verifySig,
} from '../src/signer/index.js'

// ─── Minimal valid SDF fixture ────────────────────────────────────────────────

const MINIMAL_DATA = { document_type: 'test', value: 'hello' }
const MINIMAL_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    document_type: { type: 'string' },
    value:         { type: 'string' },
  },
}

async function buildTestSDF(): Promise<Uint8Array> {
  const buf = await buildSDF({
    data:         MINIMAL_DATA,
    schema:       MINIMAL_SCHEMA,
    issuer:       'Test Issuer',
    documentType: 'test',
  })
  return buf instanceof Uint8Array ? buf : new Uint8Array(buf)
}

// ─── ECDSA tests ──────────────────────────────────────────────────────────────

describe('ECDSA signing', () => {
  let sdfBuffer: Uint8Array
  let keyPair:   CryptoKeyPair

  beforeAll(async () => {
    sdfBuffer = await buildTestSDF()
    keyPair   = await generateSDFKeyPair('ECDSA')
  })

  it('generates an ECDSA key pair', () => {
    expect(keyPair.privateKey).toBeDefined()
    expect(keyPair.publicKey).toBeDefined()
    expect(keyPair.privateKey.algorithm.name).toBe('ECDSA')
    expect(keyPair.publicKey.algorithm.name).toBe('ECDSA')
  })

  it('exports and re-imports public key', async () => {
    const exported = await exportSDFPublicKey(keyPair.publicKey)
    expect(typeof exported).toBe('string')
    expect(exported.length).toBeGreaterThan(0)

    const imported = await importSDFPublicKey(exported, 'ECDSA')
    expect(imported.type).toBe('public')
    expect(imported.algorithm.name).toBe('ECDSA')
  })

  it('exports and re-imports private key', async () => {
    const exported = await exportSDFPrivateKey(keyPair.privateKey)
    expect(typeof exported).toBe('string')

    const imported = await importSDFPrivateKey(exported, 'ECDSA')
    expect(imported.type).toBe('private')
    expect(imported.algorithm.name).toBe('ECDSA')
  })

  it('signs an SDF archive', async () => {
    const { buffer, result } = await signSDF(sdfBuffer, {
      privateKey: keyPair.privateKey,
      algorithm:  'ECDSA',
    })

    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(sdfBuffer.length)
    expect(result.algorithm).toBe('ECDSA')
    expect(result.signature).toBeTruthy()
    expect(result.signed_at).toBeTruthy()
    expect(result.content_digest).toMatch(/^[0-9a-f]{64}$/)
  })

  it('verifies a valid signature', async () => {
    const { buffer } = await signSDF(sdfBuffer, {
      privateKey: keyPair.privateKey,
      algorithm:  'ECDSA',
    })

    const result = await verifySig(buffer, {
      publicKey: keyPair.publicKey,
      algorithm: 'ECDSA',
    })

    expect(result.valid).toBe(true)
    expect(result.algorithm).toBe('ECDSA')
    expect(result.content_digest).toMatch(/^[0-9a-f]{64}$/)
    expect(result.reason).toBeUndefined()
  })

  it('rejects a signature verified with the wrong public key', async () => {
    const { buffer } = await signSDF(sdfBuffer, {
      privateKey: keyPair.privateKey,
      algorithm:  'ECDSA',
    })

    const wrongPair = await generateSDFKeyPair('ECDSA')
    const result = await verifySig(buffer, {
      publicKey: wrongPair.publicKey,
      algorithm: 'ECDSA',
    })

    expect(result.valid).toBe(false)
    expect(result.reason).toBeTruthy()
  })

  it('detects tampered data.json', async () => {
    const { buffer: signed } = await signSDF(sdfBuffer, {
      privateKey: keyPair.privateKey,
      algorithm:  'ECDSA',
    })

    // Tamper: replace data.json inside the archive
    const JSZip = (await import('jszip')).default
    const zip   = await JSZip.loadAsync(signed)
    zip.file('data.json', JSON.stringify({ document_type: 'test', value: 'TAMPERED' }, null, 2))
    const tampered = await zip.generateAsync({ type: 'uint8array' })

    const result = await verifySig(tampered, {
      publicKey: keyPair.publicKey,
      algorithm: 'ECDSA',
    })

    expect(result.valid).toBe(false)
    expect(result.reason).toContain('digest mismatch')
  })

  it('signs with includePDF and verifies correctly', async () => {
    const { buffer } = await signSDF(sdfBuffer, {
      privateKey:  keyPair.privateKey,
      algorithm:   'ECDSA',
      includePDF:  true,
    })

    const result = await verifySig(buffer, {
      publicKey:  keyPair.publicKey,
      algorithm:  'ECDSA',
      includePDF: true,
    })

    expect(result.valid).toBe(true)
  })
})

// ─── RSA tests ────────────────────────────────────────────────────────────────

describe('RSA signing', () => {
  let sdfBuffer: Uint8Array
  let keyPair:   CryptoKeyPair

  beforeAll(async () => {
    sdfBuffer = await buildTestSDF()
    keyPair   = await generateSDFKeyPair('RSASSA-PKCS1-v1_5')
  })

  it('generates an RSA key pair', () => {
    expect(keyPair.privateKey.algorithm.name).toBe('RSASSA-PKCS1-v1_5')
    expect(keyPair.publicKey.algorithm.name).toBe('RSASSA-PKCS1-v1_5')
  })

  it('signs and verifies with RSA', async () => {
    const { buffer, result } = await signSDF(sdfBuffer, {
      privateKey: keyPair.privateKey,
      algorithm:  'RSASSA-PKCS1-v1_5',
    })

    expect(result.algorithm).toBe('RSASSA-PKCS1-v1_5')

    const verify = await verifySig(buffer, {
      publicKey: keyPair.publicKey,
      algorithm: 'RSASSA-PKCS1-v1_5',
    })

    expect(verify.valid).toBe(true)
  })

  it('exports and re-imports RSA keys, still verifies', async () => {
    const { buffer } = await signSDF(sdfBuffer, {
      privateKey: keyPair.privateKey,
      algorithm:  'RSASSA-PKCS1-v1_5',
    })

    const exportedPub  = await exportSDFPublicKey(keyPair.publicKey)
    const reimportedPub = await importSDFPublicKey(exportedPub, 'RSASSA-PKCS1-v1_5')

    const result = await verifySig(buffer, {
      publicKey: reimportedPub,
      algorithm: 'RSASSA-PKCS1-v1_5',
    })

    expect(result.valid).toBe(true)
  })
})

// ─── Error handling ───────────────────────────────────────────────────────────

describe('error handling', () => {
  it('throws SDF_ERROR_NOT_ZIP when buffer is not a ZIP', async () => {
    const keyPair = await generateSDFKeyPair('ECDSA')
    const garbage = new Uint8Array([1, 2, 3, 4, 5])

    await expect(signSDF(garbage, {
      privateKey: keyPair.privateKey,
      algorithm:  'ECDSA',
    })).rejects.toThrow('SDF_ERROR_NOT_ZIP')
  })

  it('throws SDF_ERROR_INVALID_SIGNATURE when signature.sig is absent', async () => {
    const keyPair    = await generateSDFKeyPair('ECDSA')
    const sdfBuffer  = await buildTestSDF()

    await expect(verifySig(sdfBuffer, {
      publicKey: keyPair.publicKey,
      algorithm: 'ECDSA',
    })).rejects.toThrow('SDF_ERROR_INVALID_SIGNATURE')
  })
})