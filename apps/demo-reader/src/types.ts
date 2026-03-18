// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
export interface SDFMeta {
    sdf_version:          string;
    document_id:          string;
    issuer:               string;
    created_at:           string;
    issuer_id?:           string;
    document_type?:       string;
    document_version?:    string;
    recipient?:           string;
    recipient_id?:        string;
    schema_id?:           string;
    signature_algorithm?: string | null;
    parent_document_id?:  string;
    expires_at?:          string;
    tags?:                string[];
  }
  
  export interface SDFParseResult {
    meta:     SDFMeta;
    data:     Record<string, unknown>;
    schema:   Record<string, unknown>;
    pdfBytes: Uint8Array;
  }
  
  export type AppState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; message: string; code?: string }
    | { status: 'ready'; result: SDFParseResult; filename: string };