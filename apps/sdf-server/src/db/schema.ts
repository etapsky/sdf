// ─── Database Schema — Drizzle ORM ────────────────────────────────────────────
// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
// Canonical table definitions for the SDF server: tenants, api_keys,
// sdf_documents, and audit_log. All types are inferred directly from the schema.

import {
  pgTable, text, integer, bigint, boolean,
  timestamp, jsonb, uuid, index, pgEnum,
} from 'drizzle-orm/pg-core'

// ─── Tenants ──────────────────────────────────────────────────────────────────

export const tenants = pgTable('tenants', {
  id:            uuid('id').primaryKey().defaultRandom(),
  name:          text('name').notNull(),
  rateLimit:     integer('rate_limit').notNull().default(100),
  webhookUrl:    text('webhook_url'),
  webhookSecret: text('webhook_secret'),
  active:        boolean('active').notNull().default(true),
  // SAML SSO fields
  samlIdpEntityId:      text('saml_idp_entity_id'),
  samlIdpSsoUrl:        text('saml_idp_sso_url'),
  samlIdpCertificate:   text('saml_idp_certificate'),
  samlSpEntityId:       text('saml_sp_entity_id'),
  // Admin JWT secret per tenant (for SSO-issued JWTs)
  jwtSecret:     text('jwt_secret'),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Tenant    = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert

// ─── API Keys ─────────────────────────────────────────────────────────────────
// One tenant can have multiple API keys — each can be revoked independently.

export const apiKeys = pgTable('api_keys', {
  id:          uuid('id').primaryKey().defaultRandom(),
  tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  keyHash:     text('key_hash').notNull().unique(),   // SHA-256(salt + raw_key)
  keyPrefix:   text('key_prefix').notNull(),          // first 8 chars — for display only
  label:       text('label'),                         // human-readable label
  active:      boolean('active').notNull().default(true),
  lastUsedAt:  timestamp('last_used_at', { withTimezone: true }),
  expiresAt:   timestamp('expires_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt:   timestamp('revoked_at', { withTimezone: true }),
}, (table) => [
  index('idx_api_keys_tenant').on(table.tenantId),
  index('idx_api_keys_hash').on(table.keyHash),
])

export type ApiKey    = typeof apiKeys.$inferSelect
export type NewApiKey = typeof apiKeys.$inferInsert

// ─── SDF Documents ────────────────────────────────────────────────────────────

export const sdfDocuments = pgTable('sdf_documents', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  documentId:         uuid('document_id').notNull().unique(),
  tenantId:           uuid('tenant_id').notNull().references(() => tenants.id),
  issuer:             text('issuer').notNull(),
  issuerId:           text('issuer_id'),
  recipient:          text('recipient'),
  recipientId:        text('recipient_id'),
  documentType:       text('document_type'),
  sdfVersion:         text('sdf_version').notNull(),
  schemaId:           text('schema_id'),
  s3Key:              text('s3_key').notNull(),
  sizeBytes:          bigint('size_bytes', { mode: 'number' }).notNull(),
  signed:             boolean('signed').notNull().default(false),
  signatureAlgorithm: text('signature_algorithm'),
  signedAt:           timestamp('signed_at', { withTimezone: true }),
  tags:               text('tags').array(),
  createdAt:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt:          timestamp('expires_at', { withTimezone: true }),
}, (table) => [
  index('idx_sdf_documents_tenant').on(table.tenantId),
  index('idx_sdf_documents_document_type').on(table.documentType),
  index('idx_sdf_documents_document_id').on(table.documentId),
  index('idx_sdf_documents_issuer_id').on(table.issuerId),
])

export type SdfDocument    = typeof sdfDocuments.$inferSelect
export type NewSdfDocument = typeof sdfDocuments.$inferInsert

// ─── Audit Log ────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'upload'
  | 'download'
  | 'validate'
  | 'sign'
  | 'verify'
  | 'delete'
  | 'webhook_delivered'
  | 'webhook_failed'
  | 'key_created'
  | 'key_revoked'
  | 'tenant_created'
  | 'saml_login'
  | 'jwt_issued'

export const auditLog = pgTable('audit_log', {
  id:         uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => sdfDocuments.id),
  tenantId:   uuid('tenant_id').references(() => tenants.id),
  action:     text('action').$type<AuditAction>().notNull(),
  actor:      text('actor'),
  ip:         text('ip'),
  userAgent:  text('user_agent'),
  statusCode: integer('status_code'),
  metadata:   jsonb('metadata'),
  timestamp:  timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_audit_log_document').on(table.documentId),
  index('idx_audit_log_tenant').on(table.tenantId),
  index('idx_audit_log_timestamp').on(table.timestamp),
])

export type AuditEntry    = typeof auditLog.$inferSelect
export type NewAuditEntry = typeof auditLog.$inferInsert