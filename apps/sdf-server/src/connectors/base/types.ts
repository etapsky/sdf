// ─── ERP Connector Base Types ─────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Canonical contract types for all ERP connectors.
// IERPConnector is the interface every connector must implement.
// ERPConnectorConfig and ERPAuthConfig cover all supported auth strategies:
//   basic | bearer | oauth2 (client_credentials) | api_key

import type { SDFMeta } from '@etapsky/sdf-kit'

// ─── Results ──────────────────────────────────────────────────────────────────

export interface ERPPushResult {
  success:   boolean;
  erpRef:    string;           // ERP-side document reference
  erpSystem: string;           // 'SAP' | 'Oracle' | etc.
  message?:  string;
  warnings?: string[];
  raw?:      unknown;          // raw ERP response — for debugging
}

export interface ERPMatchResult {
  matched:       boolean;
  nominationRef: string;
  erpRef?:       string;       // ERP record ID if matched
  erpSystem:     string;
  confidence?:   number;       // 0-1 — for fuzzy matching
  fields?:       Record<string, unknown>;
  reason?:       string;       // if not matched
}

export interface ERPStatusResult {
  erpRef:       string;
  status:       ERPDocumentStatus;
  erpSystem:    string;
  lastUpdated?: string;        // ISO 8601
  details?:     Record<string, unknown>;
}

export type ERPDocumentStatus =
  | 'pending'
  | 'processing'
  | 'posted'
  | 'matched'
  | 'paid'
  | 'rejected'
  | 'cancelled'
  | 'unknown'

export interface ERPHealthResult {
  connected:  boolean;
  latencyMs?: number;
  system:     string;
  version?:   string;
  message?:   string;
}

// ─── Configuration ────────────────────────────────────────────────────────────

export interface ERPConnectorConfig {
  type:          'SAP' | 'Oracle' | 'NetSuite' | 'Dynamics' | 'Custom';
  baseUrl:       string;
  auth:          ERPAuthConfig;
  timeoutMs?:    number;
  debug?:        boolean;
  fieldMappings?: Record<string, string>;
}

export type ERPAuthConfig =
  | { type: 'basic';   username: string; password: string }
  | { type: 'bearer';  token: string }
  | { type: 'oauth2';  clientId: string; clientSecret: string; tokenUrl: string }
  | { type: 'api_key'; header: string; key: string }

// ─── IERPConnector interface ──────────────────────────────────────────────────

export interface IERPConnector {
  readonly type:   string;
  readonly config: ERPConnectorConfig;

  /**
   * Push a parsed SDF document to the ERP system.
   * Called after parseSDF() succeeds on an uploaded document.
   */
  pushDocument(
    data:         Record<string, unknown>,
    meta:         SDFMeta,
    documentType: string,
  ): Promise<ERPPushResult>

  /**
   * Match a nomination_ref against an ERP record.
   */
  matchNomination(nominationRef: string): Promise<ERPMatchResult>

  /**
   * Query the current status of a document in the ERP.
   */
  queryStatus(erpRef: string): Promise<ERPStatusResult>

  /**
   * Test connectivity to the ERP system.
   */
  healthCheck(): Promise<ERPHealthResult>
}

// ─── Field mapping ────────────────────────────────────────────────────────────

export interface FieldMapping {
  /** Source path in SDF data.json — dot notation e.g. "issuer.name" */
  from:       string;
  /** Target field name in ERP */
  to:         string;
  transform?: (value: unknown) => unknown;
  required?:  boolean;
}

export interface DocumentTypeMapping {
  documentType:  string;   // SDF document type e.g. "invoice"
  erpObjectType: string;   // ERP object e.g. "FI_DOCUMENT" or "AP_INVOICE"
  fields:        FieldMapping[];
}

// ─── Base error ───────────────────────────────────────────────────────────────

export class ERPConnectorError extends Error {
  constructor(
    public readonly system:  string,
    public readonly code:    string,
    message:                 string,
    public readonly raw?:    unknown,
  ) {
    super(`[${system}] ${code}: ${message}`)
    this.name = 'ERPConnectorError'
  }
}