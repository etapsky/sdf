// ─── Signer Types ─────────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Type definitions for the SDF digital signature subsystem.
// SDF_FORMAT.md Section 11.2 — Phase 4 Digital Signatures.

export type SDFSigningAlgorithm =
  | 'RSASSA-PKCS1-v1_5' // RSA-2048 with SHA-256
  | 'ECDSA'             // P-256 with SHA-256

/** Encoding of the raw signature bytes stored in signature.sig.
 *  - "p1363" : IEEE P1363 (r||s) — produced by Web Crypto API
 *  - "der"   : ASN.1 DER SEQUENCE{r,s} — produced by OS native signing (macOS SecKey, Windows NCrypt)
 *  RSA PKCS#1 v1.5 uses the same raw encoding regardless; this field only matters for ECDSA.
 */
export type SDFSignatureEncoding = 'p1363' | 'der'

export interface SDFKeyPair {
  privateKey: CryptoKey;
  publicKey:  CryptoKey;
  algorithm:  SDFSigningAlgorithm;
}

// ─── Signer Identity ──────────────────────────────────────────────────────────
// Embedded in signature.sig alongside the cryptographic bytes.
// For "self_signed" mode, subject fields may be set from user profile; no certificate chain.
// For "x509" mode, the full certificate DER and chain details are present.

export interface SDFSignerSubject {
  common_name?:  string;
  email?:        string;
  organization?: string;
  country?:      string;
}

export interface SDFSignerInfo {
  /** Determines which verification path is used. */
  mode: 'self_signed' | 'x509';
  subject?: SDFSignerSubject;
  /** Issuer distinguished name (e.g. "CN=Root CA, O=ACME Corp") — x509 only */
  issuer_name?: string;
  /** DER-encoded X.509 signing certificate, base64. x509 mode only. */
  certificate_der_b64?: string;
  /** SHA-256 fingerprint of the signing certificate, hex. */
  cert_fingerprint_sha256?: string;
  /** Certificate validity window. */
  not_before?: string;
  not_after?:  string;
  /** Raw RFC 3161 TimeStampResponse bytes, base64. Present when TSA was called. */
  tsa_token_b64?: string;
  /** genTime extracted from TSA TSTInfo (ISO 8601). */
  tsa_signed_at?: string;
  /** Encoding of the raw `signature` bytes. Absent → "p1363" (Web Crypto default). */
  signature_encoding?: SDFSignatureEncoding;
}

// ─── Sign / Verify Results ────────────────────────────────────────────────────

export interface SDFSignatureResult {
  /** Base64-encoded detached signature over the canonical signed content */
  signature:      string;
  /** Algorithm used — written to meta.json signature_algorithm */
  algorithm:      SDFSigningAlgorithm;
  /** ISO 8601 timestamp of signing */
  signed_at:      string;
  /** SHA-256 digest of the signed content (hex) — for audit */
  content_digest: string;
  /** Signer identity info — present when signerInfo was supplied */
  signer_info?:   SDFSignerInfo;
}

export interface SDFVerifyResult {
  valid:          boolean;
  algorithm:      SDFSigningAlgorithm;
  signed_at:      string;
  content_digest: string;
  /** Human-readable reason if invalid */
  reason?:        string;
  /** Signer identity read from signature.sig */
  signer_info?:   SDFSignerInfo;
}

export interface SDFSignOptions {
  /** Private CryptoKey — use generateSDFKeyPair() or importSDFPrivateKey() */
  privateKey:  CryptoKey;
  algorithm:   SDFSigningAlgorithm;
  /** Whether to include visual.pdf in signed content (default: false) */
  includePDF?: boolean;
  /** Identity to embed in signature.sig. Defaults to mode:"self_signed" with no subject. */
  signerInfo?: Partial<SDFSignerInfo>;
}

export interface SDFVerifyOptions {
  /** Public CryptoKey — use importSDFPublicKey() */
  publicKey:   CryptoKey;
  algorithm:   SDFSigningAlgorithm;
  /** Whether visual.pdf was included in signed content (default: false) */
  includePDF?: boolean;
}
