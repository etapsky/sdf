// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
/** @etapsky/cloud-sdk — Typed client for api.etapsky.com */

import type { CloudDocument, CloudMeta, CloudUsage, CloudPlan } from './types.js'

export interface SdfCloudClientOptions {
  baseUrl: string
  apiKey: string
}

/**
 * Typed API client for Etapsky SDF Cloud.
 * Usage: const client = new SdfCloudClient({ baseUrl: 'https://api.etapsky.com', apiKey: 'sdf_xxx' })
 */
export class SdfCloudClient {
  constructor(private readonly options: SdfCloudClientOptions) {}

  private async request<T>(
    method: string,
    path: string,
    init?: RequestInit & { body?: unknown }
  ): Promise<T> {
    const url = new URL(path, this.options.baseUrl).toString()
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.options.apiKey}`,
      ...(init?.headers as Record<string, string>),
    }
    if (init?.body && typeof init.body !== 'string') {
      headers['Content-Type'] = 'application/json'
    }

    const res = await fetch(url, {
      method,
      headers,
      body: init?.body
        ? typeof init.body === 'string'
          ? init.body
          : JSON.stringify(init.body)
        : undefined,
    })

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
      throw new Error(err.message || err.error || `HTTP ${res.status}`)
    }

    return res.json() as Promise<T>
  }

  async upload(file: Blob | ArrayBuffer | Uint8Array): Promise<CloudDocument> {
    const body = file instanceof Blob ? file : new Blob([new Uint8Array(file)])
    const url = new URL('/v1/sdf/upload', this.options.baseUrl).toString()
    const fd = new FormData()
    fd.append('file', body, 'document.sdf')

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.options.apiKey}` },
      body: fd,
    })

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string }
      throw new Error(err.message || `HTTP ${res.status}`)
    }

    return res.json() as Promise<CloudDocument>
  }

  async get(documentId: string): Promise<ArrayBuffer> {
    const url = new URL(`/v1/sdf/${documentId}`, this.options.baseUrl).toString()
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.options.apiKey}` },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.arrayBuffer()
  }

  async list(limit = 100): Promise<{ documents: CloudDocument[]; total: number }> {
    return this.request('GET', `/v1/sdf?limit=${limit}`)
  }

  async getMeta(documentId: string): Promise<CloudMeta> {
    return this.request('GET', `/v1/sdf/${documentId}/meta`)
  }

  async delete(documentId: string): Promise<{ deleted: boolean; id: string }> {
    return this.request('DELETE', `/v1/sdf/${documentId}`)
  }

  async getUsage(): Promise<CloudUsage> {
    return this.request('GET', '/v1/billing/usage')
  }

  async getPlans(): Promise<CloudPlan[]> {
    return this.request('GET', '/v1/billing/plans')
  }
}

export type { CloudDocument, CloudMeta, CloudUsage, CloudPlan }
