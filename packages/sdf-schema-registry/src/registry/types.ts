// ─── Registry Types ───────────────────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Canonical metadata and configuration types for the SDF schema registry.

export interface SchemaVersion {
    /** Document type — e.g. "invoice", "nomination" */
    documentType:  string;
    /** Semver major */
    major:         number;
    /** Semver minor */
    minor:         number;
    /** Version string — "MAJOR.MINOR" */
    version:       string;
    /** Full canonical $id URI */
    schemaId:      string;
    /** ISO 8601 date this version was published */
    publishedAt:   string;
    /** Human-readable description */
    description?:  string;
    /** Whether this is the latest version for this document type */
    latest:        boolean;
    /** Whether this version is deprecated */
    deprecated:    boolean;
    /** Deprecation message if deprecated */
    deprecationMessage?: string;
  }
  
  export interface SchemaEntry {
    /** The JSON Schema object */
    schema:   Record<string, unknown>;
    /** Registry metadata */
    meta:     SchemaVersion;
  }
  
  export interface RegistryConfig {
    /** Base URL for schema IDs — default: https://etapsky.github.io/sdf/schemas */
    baseUrl:        string;
    /** Whether to allow fetching remote schemas */
    allowRemote:    boolean;
    /** Timeout for remote fetches in ms — default: 5000 */
    fetchTimeout:   number;
  }
  
  export interface RegistryListResult {
    documentTypes: string[];
    schemas:       SchemaVersion[];
    total:         number;
  }