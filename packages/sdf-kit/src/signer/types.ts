// ─── Signer Types ─────────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Type definitions for the SDF digital signature subsystem.
// SDF_FORMAT.md Section 11.2 — Phase 4 Digital Signatures.

export type SDFSigningAlgorithm =
  | 'RSASSA-PKCS1-v1_5' // RSA-2048 with SHA-256
  | 'ECDSA'             // P-256 with SHA-256

export interface SDFKeyPair {
  privateKey: CryptoKey;
  publicKey:  CryptoKey;
  algorithm:  SDFSigningAlgorithm;
}

export interface SDFSignatureResult {
  /** Base64-encoded detached signature over the canonical signed content */
  signature:  string;
  /** Algorithm used — written to meta.json signature_algorithm */
  algorithm:  SDFSigningAlgorithm;
  /** ISO 8601 timestamp of signing */
  signed_at:  string;
  /** SHA-256 digest of the signed content (hex) — for audit */
  content_digest: string;
}

export interface SDFVerifyResult {
  valid:          boolean;
  algorithm:      SDFSigningAlgorithm;
  signed_at:      string;
  content_digest: string;
  /** Human-readable reason if invalid */
  reason?:        string;
}

export interface SDFSignOptions {
  /** Private CryptoKey — use generateSDFKeyPair() or importSDFPrivateKey() */
  privateKey:     CryptoKey;
  algorithm:      SDFSigningAlgorithm;
  /** Whether to include visual.pdf in signed content (default: false) */
  includePDF?:    boolean;
}

export interface SDFVerifyOptions {
  /** Public CryptoKey — use importSDFPublicKey() */
  publicKey:      CryptoKey;
  algorithm:      SDFSigningAlgorithm;
  /** Whether visual.pdf was included in signed content (default: false) */
  includePDF?:    boolean;
}