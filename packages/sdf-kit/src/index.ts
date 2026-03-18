// ─── @etapsky/sdf-kit ─────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// SDF core library — producer, reader, validator.
// SDF_FORMAT.md Section 13 — Reference Implementation.
//
// Usage:
//   import { buildSDF } from '@etapsky/sdf-kit/producer'
//   import { parseSDF } from '@etapsky/sdf-kit/reader'
//   import { validateSchema } from '@etapsky/sdf-kit/validator'
//
// Or import everything from the root:
//   import { buildSDF, parseSDF, validateSchema } from '@etapsky/sdf-kit'

// Core types and errors — always exported from root
export type {
    SDFMeta,
    SDFArchive,
    SDFProducerOptions,
    SDFValidationResult,
    SDFValidationError,
    SDFParseResult,
  } from './core/index.js';
  
  export {
    SDFError,
    SDFValidationError as SDFValidationErrorClass,
    SDF_ERRORS,
    SDF_VERSION,
    SDF_MIME_TYPE,
    SDF_EXTENSION,
    REQUIRED_FILES,
    MAX_FILE_SIZE_BYTES,
    MAX_TOTAL_SIZE_BYTES,
  } from './core/index.js';
  
  // Producer
  export { buildSDF, generatePDF, packContainer } from './producer/index.js';
  
  // Reader
  export { parseSDF, extractJSON } from './reader/index.js';
  
  // Validator
  export {
    validateMeta,
    validateSchema,
    validateSchemaOrThrow,
    checkVersion,
  } from './validator/index.js';

  // Signer (Phase 4)
export type {
  SDFSigningAlgorithm,
  SDFKeyPair,
  SDFSignatureResult,
  SDFVerifyResult,
  SDFSignOptions,
  SDFVerifyOptions,
} from './signer/index.js';

export {
  generateSDFKeyPair,
  exportSDFPublicKey,
  exportSDFPrivateKey,
  importSDFPublicKey,
  importSDFPrivateKey,
  signSDF,
  verifySig,
} from './signer/index.js';