// ─── SDF Core Types ───────────────────────────────────────────────────────────
// Canonical type definitions for @etapsky/sdf-kit.
// SDF_FORMAT.md — authoritative source for all field semantics.

export interface SDFMeta {
    // Required fields (SDF_FORMAT.md Section 4.6.1)
    sdf_version:  string;
    document_id:  string;
    issuer:       string;
    created_at:   string;
    // Optional fields (SDF_FORMAT.md Section 4.6.2)
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
  
  export interface SDFArchive {
    meta:     SDFMeta;
    data:     Record<string, unknown>;
    schema:   Record<string, unknown>;
    pdfBytes: Uint8Array;
  }
  
  export interface SDFProducerOptions {
    data:          Record<string, unknown>;
    schema:        Record<string, unknown>;
    issuer:        string;
    issuerId?:     string;
    documentType?: string;
    recipient?:    string;
    recipientId?:  string;
    schemaId?:     string;
    tags?:         string[];
  }
  
  export interface SDFValidationResult {
    valid:  boolean;
    errors: SDFValidationError[];
  }
  
  export interface SDFValidationError {
    code:      string;
    message:   string;
    details?:  unknown;
    file?:     string;
  }
  
  export interface SDFParseResult {
    meta:     SDFMeta;
    data:     Record<string, unknown>;
    schema:   Record<string, unknown>;
    pdfBytes: Uint8Array;
  }