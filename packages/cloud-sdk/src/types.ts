// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
/** @etapsky/cloud-sdk — Type definitions for SDF Cloud API */

export interface CloudDocument {
  id: string
  document_id: string
  document_type: string | null
  sdf_version: string
  issuer: string
  size_bytes: number
  created_at: string
}

export interface CloudMeta {
  sdf_version: string
  document_id: string
  issuer: string
  created_at: string
  document_type?: string
  [key: string]: unknown
}

export interface CloudUsage {
  uploads_count: number
  downloads_count: number
  storage_bytes: number
  api_calls_count: number
  period_start: string
  period_end: string
}

export interface CloudPlan {
  id: string
  name: 'free' | 'pro' | 'enterprise'
  uploads_per_month: number
  storage_bytes: number
  api_calls_per_month: number
  price_cents?: number
}
