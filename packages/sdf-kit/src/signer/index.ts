// ─── Signer Public API ────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Barrel re-export for the @etapsky/sdf-kit signer module.
// Exposes key management, signing, and verification utilities.

export type {
    SDFSigningAlgorithm,
    SDFKeyPair,
    SDFSignatureResult,
    SDFVerifyResult,
    SDFSignOptions,
    SDFVerifyOptions,
  } from './types.js'
  
  export {
    generateSDFKeyPair,
    exportSDFPublicKey,
    exportSDFPrivateKey,
    importSDFPublicKey,
    importSDFPrivateKey,
    signSDF,
  } from './sign.js'
  
  export { verifySig } from './verify.js'